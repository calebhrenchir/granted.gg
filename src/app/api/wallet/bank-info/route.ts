import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { stripeConnectAccountId: true },
        });

        if (!user?.stripeConnectAccountId) {
            return NextResponse.json({
                success: true,
                hasBankAccount: false,
                bankName: null,
                accountType: null,
                last4: null,
            });
        }

        try {
            const externalAccounts = await stripe.accounts.listExternalAccounts(
                user.stripeConnectAccountId,
                { object: "bank_account", limit: 1 }
            );

            if (externalAccounts.data.length === 0) {
                return NextResponse.json({
                    success: true,
                    hasBankAccount: false,
                    bankName: null,
                    accountType: null,
                    last4: null,
                });
            }

            const bankAccount = externalAccounts.data[0] as Stripe.BankAccount;
            
            return NextResponse.json({
                success: true,
                hasBankAccount: true,
                bankName: bankAccount.bank_name || null,
                accountType: bankAccount.account_holder_type || null,
                last4: bankAccount.last4 || null,
            });
        } catch (error) {
            console.error("Error fetching bank information:", error);
            return NextResponse.json({
                success: true,
                hasBankAccount: false,
                bankName: null,
                accountType: null,
                last4: null,
            });
        }
    } catch (error) {
        console.error("Error fetching bank info:", error);
        return NextResponse.json(
            { error: "Failed to fetch bank information" },
            { status: 500 }
        );
    }
}

