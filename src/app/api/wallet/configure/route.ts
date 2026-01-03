import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import Stripe from "stripe";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { routingNumber, accountNumber, accountType } = await request.json();

    if (!routingNumber || !accountNumber || !accountType || accountType === "select") {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Get user with onboarding data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        phoneNumber: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        stripeConnectAccountId: true,
        stripeVerificationSessionId: true,
        isIdentityVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user has completed onboarding (required for Stripe Connect)
    if (!user.firstName || !user.lastName || !user.dateOfBirth || !user.addressLine1 || !user.city || !user.state || !user.postalCode || !user.country) {
      return NextResponse.json(
        { error: "Please complete onboarding before configuring your wallet" },
        { status: 400 }
      );
    }

    // Check if user has completed identity verification
    if (!user.isIdentityVerified || !user.stripeVerificationSessionId) {
      return NextResponse.json(
        { error: "Please complete identity verification before configuring your wallet" },
        { status: 400 }
      );
    }

    // Retrieve the verification session to get the verification data
    let verificationSession;
    try {
      verificationSession = await stripe.identity.verificationSessions.retrieve(
        user.stripeVerificationSessionId
      );
      
      if (verificationSession.status !== "verified") {
        return NextResponse.json(
          { error: "Identity verification is not complete. Please complete verification first." },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("Error retrieving verification session:", error);
      return NextResponse.json(
        { error: "Could not retrieve verification information. Please complete identity verification again." },
        { status: 400 }
      );
    }

    // Extract document and ID number from verified outputs
    // The verified_outputs contains the document information and ID number
    const verifiedOutputs = verificationSession.verified_outputs as any;
    const documentFront = verifiedOutputs?.document?.front;
    const documentBack = verifiedOutputs?.document?.back;
    const idNumber = verifiedOutputs?.id_number; // SSN/ITIN extracted from document

    let connectedAccountId = user.stripeConnectAccountId;

    // Get client IP for TOS acceptance
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const clientIp = forwardedFor?.split(",")[0] || realIp || "unknown";

    // Create or update Stripe Connect account
    if (!connectedAccountId) {
      // Create new connected account
      const accountParams: Stripe.AccountCreateParams = {
        type: "custom",
        country: user.country || "US",
        email: user.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: accountType === "business" ? "company" : "individual",
        // Add business profile with default values (required for all accounts)
        // Always use a valid, hardcoded URL to avoid any environment variable issues
        business_profile: {
          mcc: "5815", // Default to Digital Goods Media
          url: "https://granted.gg",
        },
        // Accept TOS automatically
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000), // Unix timestamp
          ip: clientIp,
        },
        individual: {
          first_name: user.firstName,
          last_name: user.lastName,
          email: user.email || undefined,
          phone: user.phoneNumber || undefined,
          ...(user.dateOfBirth && {
            dob: {
              day: new Date(user.dateOfBirth).getDate(),
              month: new Date(user.dateOfBirth).getMonth() + 1,
              year: new Date(user.dateOfBirth).getFullYear(),
            },
          }),
          address: {
            line1: user.addressLine1,
            line2: user.addressLine2 || undefined,
            city: user.city,
            state: user.state,
            postal_code: user.postalCode,
            country: user.country,
          },
          // Link the Identity verification document and ID number to the Connect account
          ...(idNumber && {
            id_number: idNumber,
          }),
          ...((documentFront || documentBack) && {
            verification: {
              document: {
                ...(documentFront && { front: documentFront }),
                ...(documentBack && { back: documentBack }),
              },
            },
          }),
        },
      };
      
      const account = await stripe.accounts.create(accountParams);

      connectedAccountId = account.id;

      // Save connected account ID to user
      await prisma.user.update({
        where: { id: user.id },
        data: {
          stripeConnectAccountId: connectedAccountId,
        },
      });
    } else {
      // Retrieve current account to check what's already set
      const currentAccount = await stripe.accounts.retrieve(connectedAccountId);
      
      // Always ensure business profile and TOS are set (required for payouts)
      // Since we handle all sales, we use platform defaults
      // Always use a valid, hardcoded URL to avoid any environment variable issues
      const updateParams: Stripe.AccountUpdateParams = {
        // Always set business profile to platform defaults (we handle all sales)
        business_profile: {
          mcc: currentAccount.business_profile?.mcc || "5815", // Digital Goods Media
          url: "https://granted.gg",
        },
        // Always ensure TOS is accepted
        tos_acceptance: {
          date: currentAccount.tos_acceptance?.date || Math.floor(Date.now() / 1000),
          ip: currentAccount.tos_acceptance?.ip || clientIp,
        },
        individual: {
          first_name: user.firstName,
          last_name: user.lastName,
          email: user.email || undefined,
          phone: user.phoneNumber || undefined,
          ...(user.dateOfBirth && {
            dob: {
              day: new Date(user.dateOfBirth).getDate(),
              month: new Date(user.dateOfBirth).getMonth() + 1,
              year: new Date(user.dateOfBirth).getFullYear(),
            },
          }),
          address: {
            line1: user.addressLine1,
            line2: user.addressLine2 || undefined,
            city: user.city,
            state: user.state,
            postal_code: user.postalCode,
            country: user.country,
          },
          // Link the Identity verification document and ID number to the Connect account
          ...(idNumber && {
            id_number: idNumber,
          }),
          ...((documentFront || documentBack) && {
            verification: {
              document: {
                ...(documentFront && { front: documentFront }),
                ...(documentBack && { back: documentBack }),
              },
            },
          }),
        },
      };
      
      await stripe.accounts.update(connectedAccountId, updateParams);
    }

    // Check if external account already exists
    const existingExternalAccounts = await stripe.accounts.listExternalAccounts(connectedAccountId, {
      limit: 10,
    });

    // Create external account (bank account) token on the platform account
    const token = await stripe.tokens.create({
      bank_account: {
        country: user.country || "US",
        currency: "usd",
        account_number: accountNumber,
        routing_number: routingNumber,
        account_holder_type: accountType === "business" ? "company" : "individual",
      },
    });

    // Find existing default bank account (if any)
    const defaultAccount = existingExternalAccounts.data.find(
      (acc) => acc.default_for_currency === true && acc.object === "bank_account"
    );

    // Add new bank account to connected account and set it as default
    // This will automatically unset the old default account
    const externalAccount = await stripe.accounts.createExternalAccount(connectedAccountId, {
      external_account: token.id,
      default_for_currency: true,
    });

    // Now that the new account is set as default, we can safely delete the old default account
    if (defaultAccount && defaultAccount.id !== externalAccount.id) {
      try {
        await stripe.accounts.deleteExternalAccount(connectedAccountId, defaultAccount.id);
      } catch (error) {
        // If deletion fails (e.g., account was already deleted), log but don't fail the request
        console.error("Error deleting old default account:", error);
      }
    }

    // Get bank name from the external account or token
    // Stripe returns bank details in the external account object
    let bankName: string | undefined;
    if (externalAccount.object === "bank_account") {
      // Bank name is available in the bank_account object
      bankName = (externalAccount as Stripe.BankAccount).bank_name || undefined;
    }
    
    // If not available in external account, try to get from token
    if (!bankName && token.bank_account) {
      bankName = token.bank_account.bank_name || undefined;
    }

    // Check if account needs additional verification
    const account = await stripe.accounts.retrieve(connectedAccountId);
    const needsVerification = account.individual?.verification?.status === "unverified" || 
                              account.individual?.verification?.status === "pending";

    // If verification is needed, create an account link for additional verification
    let accountLinkUrl = null;
    if (needsVerification) {
      const baseUrl = "https://granted.gg"//process.env.NEXT_PUBLIC_BASE_URL || "http://app.localhost:3000";
      //console.log("baseUrl", baseUrl);
      const accountLink = await stripe.accountLinks.create({
        account: connectedAccountId,
        refresh_url: `${baseUrl}/wallet?refresh=true`,
        return_url: `${baseUrl}/wallet?success=true`,
        type: "account_onboarding",
      });
      accountLinkUrl = accountLink.url;
    }

    return NextResponse.json({
      success: true,
      connectedAccountId,
      externalAccountId: externalAccount.id,
      bankName,
      needsVerification,
      accountLinkUrl,
    });
  } catch (error: any) {
    console.error("Error configuring wallet:", error);
    
    // Handle Stripe-specific errors
    if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json(
        { error: error.message || "Invalid bank account information" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to configure wallet" },
      { status: 500 }
    );
  }
}

