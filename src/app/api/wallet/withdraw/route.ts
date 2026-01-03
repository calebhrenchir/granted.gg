import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe, dollarsToCents, centsToDollars } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { payoutMethod } = await request.json();
    
    // Validate payout method
    if (payoutMethod && payoutMethod !== "instant" && payoutMethod !== "standard") {
      return NextResponse.json(
        { error: "Invalid payout method. Must be 'instant' or 'standard'" },
        { status: 400 }
      );
    }

    // Default to standard if not specified
    const method = payoutMethod || "standard";

    // Get user with connected account
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        stripeConnectAccountId: true,
        isIdentityVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user has completed identity verification
    if (!user.isIdentityVerified) {
      return NextResponse.json(
        { error: "Please complete identity verification before withdrawing funds" },
        { status: 400 }
      );
    }

    // Check if user has a connected account
    if (!user.stripeConnectAccountId) {
      return NextResponse.json(
        { error: "Please configure your wallet before withdrawing funds" },
        { status: 400 }
      );
    }

    // Fetch all links for the user to calculate total earnings
    const links = await prisma.link.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        totalEarnings: true,
      },
    });

    // Calculate total available funds
    const totalAvailableFunds = links.reduce((sum, link) => {
      return sum + Number(link.totalEarnings);
    }, 0);

    if (totalAvailableFunds <= 0) {
      return NextResponse.json(
        { error: "No funds available to withdraw" },
        { status: 400 }
      );
    }

    // Verify the connected account exists and is active
    let connectedAccount;
    try {
      connectedAccount = await stripe.accounts.retrieve(user.stripeConnectAccountId);
      
      // Check if account is enabled and can receive payouts
      if (!connectedAccount.payouts_enabled) {
        // Get account requirements to provide more specific error
        const requirements = connectedAccount.requirements;
        const currentlyDue = requirements?.currently_due || [];
        const eventuallyDue = requirements?.eventually_due || [];
        const pastDue = requirements?.past_due || [];
        const disabledReason = requirements?.disabled_reason;
        
        // Check if there are any missing requirements
        const missingRequirements = [...currentlyDue, ...eventuallyDue, ...pastDue];
        
        // Check if account has external accounts (bank accounts)
        let hasBankAccount = false;
        try {
          const externalAccounts = await stripe.accounts.listExternalAccounts(
            user.stripeConnectAccountId,
            { object: "bank_account", limit: 1 }
          );
          hasBankAccount = externalAccounts.data.length > 0;
        } catch (err) {
          console.error("Error checking external accounts:", err);
        }
        
        let errorMessage = "Your connected account is not ready to receive payouts. ";
        
        // Provide specific guidance based on what's missing
        if (!hasBankAccount) {
          errorMessage = "Please add a bank account in your wallet settings before withdrawing funds.";
        } else if (missingRequirements.length > 0) {
          // Format requirement names to be more user-friendly
          const formattedRequirements = missingRequirements.map((req: string) => {
            return req.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
          });
          errorMessage += "Please complete: " + formattedRequirements.join(", ");
        } else if (disabledReason) {
          errorMessage += `Account status: ${disabledReason}. Please complete the onboarding process.`;
        } else {
          errorMessage += "Please complete the onboarding process in your wallet settings.";
        }
        
        // Log detailed account status for debugging
        console.log("Account payout status:", {
          payouts_enabled: connectedAccount.payouts_enabled,
          charges_enabled: connectedAccount.charges_enabled,
          details_submitted: connectedAccount.details_submitted,
          currently_due: currentlyDue,
          past_due: pastDue,
          disabled_reason: disabledReason,
          hasBankAccount,
        });
        
        // Create account link for onboarding if needed
        let accountLinkUrl = null;
        try {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://app.localhost:3000";
          const accountLink = await stripe.accountLinks.create({
            account: user.stripeConnectAccountId,
            refresh_url: `${baseUrl}/wallet?refresh=true`,
            return_url: `${baseUrl}/wallet?success=true`,
            type: "account_onboarding",
          });
          accountLinkUrl = accountLink.url;
        } catch (linkError) {
          console.error("Error creating account link:", linkError);
        }
        
        return NextResponse.json(
          { 
            error: errorMessage,
            needsOnboarding: true,
            requirements: missingRequirements,
            accountLinkUrl,
            hasBankAccount,
          },
          { status: 400 }
        );
      }
    } catch (error: any) {
      console.error("Error retrieving connected account:", error);
      return NextResponse.json(
        { error: "Unable to verify connected account. Please reconfigure your wallet." },
        { status: 400 }
      );
    }

    // Convert dollars to cents for Stripe
    const amountInCents = dollarsToCents(totalAvailableFunds);

    // Create transfer to connected account
    let transfer;
    try {
      transfer = await stripe.transfers.create({
        amount: amountInCents,
        currency: "usd",
        destination: user.stripeConnectAccountId,
        metadata: {
          userId: user.id,
          userEmail: user.email || "",
          payoutMethod: method,
        },
      });
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create transfer. Please try again." },
        { status: 500 }
      );
    }

    // Create payout to connected account's bank account
    let payout;
    try {
      // For instant payouts, use instant method; for standard, use standard (or omit for default)
      const payoutParams: any = {
        amount: amountInCents,
        currency: "usd",
        metadata: {
          userId: user.id,
          userEmail: user.email || "",
          transferId: transfer.id,
        },
      };

      if (method === "instant") {
        payoutParams.method = "instant";
      } else {
        payoutParams.method = "standard";
      }

      // Create payout on the connected account
      payout = await stripe.payouts.create(payoutParams, {
        stripeAccount: user.stripeConnectAccountId,
      });
    } catch (error: any) {
      console.error("Error creating payout:", error);
      // If payout fails, the transfer still succeeded, so we should still record the withdrawal
      // but log the error
      console.warn("Transfer succeeded but payout creation failed:", error);
    }

    // Create withdraw activities and update link earnings in a transaction
    await prisma.$transaction(async (tx) => {
      // Create withdraw activities for each link that has earnings
      for (const link of links) {
        const linkEarnings = Number(link.totalEarnings);
        if (linkEarnings > 0) {
          // Create withdraw activity
          await tx.activity.create({
            data: {
              linkId: link.id,
              type: "withdraw",
              amount: dollarsToCents(linkEarnings), // Store in cents
            },
          });

          // Reset link earnings to 0
          await tx.link.update({
            where: { id: link.id },
            data: {
              totalEarnings: 0,
            },
          });
        }
      }
    });

    // Calculate fees for instant payouts
    const instantFee = method === "instant" ? Math.max(totalAvailableFunds * 0.01, 0.50) : 0;
    const netAmount = totalAvailableFunds - instantFee;

    return NextResponse.json({
      success: true,
      transferId: transfer.id,
      payoutId: payout?.id,
      amount: totalAvailableFunds,
      netAmount: netAmount,
      fee: instantFee,
      method: method,
      message: method === "instant" 
        ? "Instant withdrawal initiated successfully" 
        : "Withdrawal initiated successfully",
    });
  } catch (error: any) {
    console.error("Error processing withdrawal:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process withdrawal" },
      { status: 500 }
    );
  }
}

