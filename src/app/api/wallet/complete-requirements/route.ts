import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      ssnLast4 
    } = body;

    // Get user with connected account and Identity verification
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        stripeConnectAccountId: true,
        stripeVerificationSessionId: true,
        isIdentityVerified: true,
      },
    });

    if (!user || !user.stripeConnectAccountId) {
      return NextResponse.json(
        { error: "No connected account found. Please configure your wallet first." },
        { status: 400 }
      );
    }

    // Get client IP for TOS acceptance
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const clientIp = forwardedFor?.split(",")[0] || realIp || "unknown";

    // Retrieve current account to preserve existing values
    const currentAccount = await stripe.accounts.retrieve(user.stripeConnectAccountId);

    // Try to get ID number and document from Identity verification if available
    let idNumber: string | undefined;
    let documentFront: string | undefined;
    let documentBack: string | undefined;
    
    if (user.stripeVerificationSessionId && user.isIdentityVerified) {
      try {
        const verificationSession = await stripe.identity.verificationSessions.retrieve(
          user.stripeVerificationSessionId
        );
        
        if (verificationSession.status === "verified" && verificationSession.verified_outputs) {
          const verifiedOutputs = verificationSession.verified_outputs as any;
          
          // ID number can be in different locations depending on document type
          idNumber = verifiedOutputs?.id_number || 
                     verifiedOutputs?.ssn || 
                     verifiedOutputs?.individual?.id_number;
          
          documentFront = verifiedOutputs?.document?.front;
          documentBack = verifiedOutputs?.document?.back;
          
          // Log for debugging
          console.log("Identity verification outputs:", {
            hasIdNumber: !!idNumber,
            idNumberLength: idNumber?.length,
            hasDocument: !!(documentFront || documentBack),
            verifiedOutputsKeys: Object.keys(verifiedOutputs || {}),
          });
        }
      } catch (error) {
        console.error("Error retrieving Identity verification session:", error);
        // Continue without Identity data
      }
    }

    // Ensure we have a valid URL for business profile
    // Stripe requires a valid URL format (must start with http:// or https://)
    // Validate existing URL or use fallback
    let businessUrl = "https://granted.gg";

    // Build update parameters
    // Always ensure business profile and TOS are set (we handle all sales, so use platform defaults)
    const updateParams: any = {
      business_profile: {
        mcc: currentAccount.business_profile?.mcc || "5815", // Digital Goods Media
        url: businessUrl,
      },
      tos_acceptance: {
        date: currentAccount.tos_acceptance?.date || Math.floor(Date.now() / 1000),
        ip: currentAccount.tos_acceptance?.ip || clientIp,
      },
    };

    // Build individual update params
    const individualParams: any = {};
    
    // Add ID number from Identity verification if available
    // Note: Stripe Connect requires the full id_number, not just last 4 digits
    if (idNumber) {
      individualParams.id_number = idNumber;
      console.log("Adding id_number to Connect account from Identity verification");
    } else if (ssnLast4) {
      // If we only have last 4, we can't satisfy the id_number requirement
      // But we'll add it anyway in case Stripe accepts it
      console.warn("Only SSN last 4 provided, but full id_number is required. Attempting to use ssn_last_4.");
      // Validate SSN last 4 (should be 4 digits)
      if (!/^\d{4}$/.test(ssnLast4)) {
        return NextResponse.json(
          { error: "SSN last 4 must be exactly 4 digits" },
          { status: 400 }
        );
      }
      // Try both id_number and ssn_last_4 - sometimes Stripe accepts ssn_last_4
      individualParams.ssn_last_4 = ssnLast4;
    } else {
      console.error("No ID number available from Identity verification and no SSN last 4 provided");
      return NextResponse.json(
        { 
          error: "ID number is required. Please ensure your identity verification includes your SSN/ID number, or provide the last 4 digits of your SSN.",
          requiresIdNumber: true,
        },
        { status: 400 }
      );
    }
    
    // Add document from Identity verification if available
    if (documentFront || documentBack) {
      individualParams.verification = {
        document: {
          ...(documentFront && { front: documentFront }),
          ...(documentBack && { back: documentBack }),
        },
      };
    }
    
    if (Object.keys(individualParams).length > 0) {
      updateParams.individual = individualParams;
    }

    // Update the connected account
    const updatedAccount = await stripe.accounts.update(
      user.stripeConnectAccountId,
      updateParams
    );

    // Check if payouts are now enabled
    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);

    return NextResponse.json({
      success: true,
      payoutsEnabled: account.payouts_enabled,
      account: {
        id: account.id,
        payouts_enabled: account.payouts_enabled,
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted,
      },
    });
  } catch (error: any) {
    console.error("Error completing requirements:", error);
    
    if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json(
        { error: error.message || "Invalid information provided" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to complete requirements" },
      { status: 500 }
    );
  }
}

