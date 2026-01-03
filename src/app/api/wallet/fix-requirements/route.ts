import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";

/**
 * Automatically fixes requirements that we can handle without user input.
 * Since we handle all sales, we use platform defaults for MCC and URL.
 * Only SSN requires user input (for tax/1099 purposes).
 */
export async function POST(request: Request) {
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
        stripeConnectAccountId: true,
      },
    });

    if (!user || !user.stripeConnectAccountId) {
      return NextResponse.json(
        { error: "No connected account found" },
        { status: 400 }
      );
    }

    // Get client IP for TOS acceptance
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const clientIp = forwardedFor?.split(",")[0] || realIp || "unknown";

    // Retrieve current account
    const currentAccount = await stripe.accounts.retrieve(user.stripeConnectAccountId);

    // Build update params - automatically set what we can
    // Ensure URL is valid (must start with http:// or https://)
    // Validate existing URL or use fallback
    let businessUrl = "https://granted.gg";
    
    const updateParams: any = {
      // Always set business profile to platform defaults (we handle all sales)
      business_profile: {
        mcc: currentAccount.business_profile?.mcc || "5815", // Digital Goods Media
        url: businessUrl,
      },
      // Always ensure TOS is accepted
      tos_acceptance: {
        date: currentAccount.tos_acceptance?.date || Math.floor(Date.now() / 1000),
        ip: currentAccount.tos_acceptance?.ip || clientIp,
      },
    };

    // Update the account
    await stripe.accounts.update(user.stripeConnectAccountId, updateParams);

    // Retrieve updated account to check remaining requirements
    const updatedAccount = await stripe.accounts.retrieve(user.stripeConnectAccountId);
    const requirements = updatedAccount.requirements;
    const currentlyDue = requirements?.currently_due || [];
    const eventuallyDue = requirements?.eventually_due || [];
    const pastDue = requirements?.past_due || [];
    
    const missingRequirements = [...new Set([...currentlyDue, ...eventuallyDue, ...pastDue])];
    
    // Filter to only requirements that need user input (SSN)
    const userInputRequired = missingRequirements.filter((req: string) => {
      return req.includes('individual.ssn_last_4');
    });

    return NextResponse.json({
      success: true,
      payoutsEnabled: updatedAccount.payouts_enabled,
      userInputRequired,
      allMissingRequirements: missingRequirements,
    });
  } catch (error: any) {
    console.error("Error fixing requirements:", error);
    
    if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json(
        { error: error.message || "Invalid request" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fix requirements" },
      { status: 500 }
    );
  }
}

