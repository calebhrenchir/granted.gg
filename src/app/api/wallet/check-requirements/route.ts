import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { headers } from "next/headers";
import WalletRequirementsEmail from "@/emails/wallet-requirements";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user with connected account
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        stripeConnectAccountId: true,
        emailNotificationCashOut: true,
      },
    });

    if (!user || !user.stripeConnectAccountId) {
      return NextResponse.json({
        success: true,
        hasRequirements: false,
        missingRequirements: [],
      });
    }

    // Retrieve connected account and check requirements
    let connectedAccount = await stripe.accounts.retrieve(user.stripeConnectAccountId);
    const requirements = connectedAccount.requirements;
    const currentlyDue = requirements?.currently_due || [];
    const eventuallyDue = requirements?.eventually_due || [];
    const pastDue = requirements?.past_due || [];
    
    let missingRequirements = [...new Set([...currentlyDue, ...eventuallyDue, ...pastDue])];
    
    // First, try to auto-fix requirements we can handle (MCC, URL, TOS)
    const autoFixable = missingRequirements.filter((req: string) => {
      return req.includes('business_profile.mcc') ||
             req.includes('business_profile.url') ||
             req.includes('tos_acceptance');
    });

    // If there are auto-fixable requirements, fix them automatically
    if (autoFixable.length > 0) {
      try {
        // Get client IP for TOS acceptance
        const headersList = await headers();
        const forwardedFor = headersList.get("x-forwarded-for");
        const realIp = headersList.get("x-real-ip");
        const clientIp = forwardedFor?.split(",")[0] || realIp || "unknown";

        // Auto-fix: set business profile and TOS
        // Ensure URL is valid (must start with http:// or https://)
        // Validate existing URL or use fallback
        let businessUrl = "https://granted.gg";
        
        await stripe.accounts.update(user.stripeConnectAccountId, {
          business_profile: {
            mcc: connectedAccount.business_profile?.mcc || "5815", // Digital Goods Media
            url: "https://granted.gg",
          },
          tos_acceptance: {
            date: connectedAccount.tos_acceptance?.date || Math.floor(Date.now() / 1000),
            ip: connectedAccount.tos_acceptance?.ip || clientIp,
          },
        });
        
        // Re-check requirements after auto-fix
        connectedAccount = await stripe.accounts.retrieve(user.stripeConnectAccountId);
        const updatedRequirements = connectedAccount.requirements;
        const updatedCurrentlyDue = updatedRequirements?.currently_due || [];
        const updatedEventuallyDue = updatedRequirements?.eventually_due || [];
        const updatedPastDue = updatedRequirements?.past_due || [];
        missingRequirements = [...new Set([...updatedCurrentlyDue, ...updatedEventuallyDue, ...updatedPastDue])];
      } catch (fixError) {
        console.error("Error auto-fixing requirements:", fixError);
      }
    }
    
    // Filter to only requirements that need user input (SSN)
    const handleableRequirements = missingRequirements.filter((req: string) => {
      return req.includes('individual.ssn_last_4');
    });

    // If there are handleable requirements and user has email notifications enabled, send email
    if (handleableRequirements.length > 0 && user.email && user.emailNotificationCashOut && process.env.RESEND_API_KEY) {
      try {
        const emailHtml = await render(
          WalletRequirementsEmail({
            firstName: user.firstName || undefined,
            missingRequirements: handleableRequirements,
          })
        );

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Granted <no-reply@granted.gg>",
          to: user.email,
          subject: "Action Required: Complete Your Wallet Setup",
          html: emailHtml,
        });
      } catch (emailError) {
        console.error("Error sending requirements email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      hasRequirements: missingRequirements.length > 0,
      missingRequirements: handleableRequirements,
      allMissingRequirements: missingRequirements,
      payoutsEnabled: connectedAccount.payouts_enabled,
    });
  } catch (error: any) {
    console.error("Error checking requirements:", error);
    return NextResponse.json(
      { error: "Failed to check requirements" },
      { status: 500 }
    );
  }
}

