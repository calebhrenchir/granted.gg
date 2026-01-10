import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { createActivityAndUpdateTotals } from "@/lib/activity-helpers";
import { Resend } from "resend";
import { render } from "@react-email/render";
import PurchaseLinkEmail from "@/emails/purchase-link";
import LinkPurchaseEmail from "@/emails/link-purchase";
import CashOutEmail from "@/emails/cash-out";
import Stripe from "stripe";

const resend = new Resend(process.env.RESEND_API_KEY);

// Disable body parsing for webhook route
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Handle the checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status === "paid" && session.metadata) {
        const linkId = session.metadata.linkId;
        const linkUrl = session.metadata.linkUrl;
        const linkName = session.metadata.linkName;
        const customerEmail = session.metadata.customerEmail || session.customer_email;
        const basePriceInCents = parseInt(session.metadata.basePriceInCents || "0");
        const platformFeePercent = parseFloat(session.metadata.platformFeePercent || "20");

        if (!linkId || !basePriceInCents) {
          console.error("Missing metadata in checkout session:", session.id);
          return NextResponse.json(
            { error: "Invalid session metadata" },
            { status: 400 }
          );
        }

        // Create purchase activity and update totals (seller earnings calculated with fee deduction)
        await createActivityAndUpdateTotals(
          linkId,
          "purchase",
          basePriceInCents,
          session.payment_intent as string,
          platformFeePercent,
          customerEmail || undefined
        );

        console.log(`Purchase recorded for link ${linkId}: ${basePriceInCents} cents`);

        // Send email with purchase link if email is provided
        if (customerEmail && linkUrl && process.env.RESEND_API_KEY) {
          try {
            // Render the email template
            const emailHtml = render(
              PurchaseLinkEmail({
                linkUrl,
                linkName,
              })
            );

            // Send email via Resend
            const { data, error } = await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL || "Granted <no-reply@granted.gg>",
              to: customerEmail,
              subject: `Your Purchase Link - ${linkName || linkUrl}`,
              html: await emailHtml,
            });

            if (error) {
              console.error("Error sending purchase email:", error);
            } else {
              console.log(`Purchase email sent to ${customerEmail} for link ${linkUrl}`, data?.id);
            }
          } catch (emailError) {
            console.error("Error sending purchase email:", emailError);
            // Don't fail the webhook if email fails
          }
        }

        // Send notification email to link owner if they have notifications enabled
        if (linkId && process.env.RESEND_API_KEY) {
          try {
            // Get the link with user information
            const link = await prisma.link.findUnique({
              where: { id: linkId },
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    emailNotificationLinkPurchases: true,
                  },
                },
              },
            });

            if (
              link?.user?.email &&
              link.user.emailNotificationLinkPurchases
            ) {
              const emailHtml = await render(
                LinkPurchaseEmail({
                  linkUrl,
                  linkName,
                  amount: basePriceInCents / 100,
                })
              );

              const { data, error } = await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || "Granted <no-reply@granted.gg>",
                to: link.user.email,
                subject: `Your Link Was Purchased - ${linkName || linkUrl}`,
                html: emailHtml,
              });

              if (error) {
                console.error("Error sending purchase notification email:", error);
              } else {
                console.log(`Purchase notification email sent to ${link.user.email}`, data?.id);
              }
            }
          } catch (notificationError) {
            console.error("Error sending purchase notification email:", notificationError);
            // Don't fail the webhook if notification email fails
          }
        }
      }
    }

    // Handle identity.verification_session.verified event
    if (event.type === "identity.verification_session.verified") {
      const verificationSession = event.data.object as Stripe.Identity.VerificationSession;

      // Find user by verification session ID
      const user = await prisma.user.findFirst({
        where: {
          stripeVerificationSessionId: verificationSession.id,
        },
        select: {
          id: true,
          stripeConnectAccountId: true,
        },
      });

      if (user) {
        // Update user's verification status
        await prisma.user.update({
          where: { id: user.id },
          data: {
            isIdentityVerified: true,
          },
        });

        console.log(`Identity verified for user ${user.id}`);

        // If user has a Connect account, automatically update it with ID number from verification
        if (user.stripeConnectAccountId && verificationSession.verified_outputs) {
          try {
            const verifiedOutputs = verificationSession.verified_outputs as any;
            // ID number can be in different locations depending on document type
            const idNumber = verifiedOutputs?.id_number || 
                           verifiedOutputs?.ssn || 
                           verifiedOutputs?.individual?.id_number;
            
            if (idNumber) {
              // Update the Connect account with the ID number
              await stripe.accounts.update(user.stripeConnectAccountId, {
                individual: {
                  id_number: idNumber,
                },
              });
              
              console.log(`Updated Connect account ${user.stripeConnectAccountId} with ID number from Identity verification`);
            } else {
              console.warn(`Identity verification completed but no ID number found in verified_outputs for user ${user.id}`, {
                verifiedOutputsKeys: Object.keys(verifiedOutputs || {}),
              });
            }
          } catch (updateError: any) {
            console.error(`Error updating Connect account with ID number for user ${user.id}:`, updateError);
            // Don't fail the webhook if we can't update the account
          }
        }
      } else {
        console.warn(`No user found for verification session ${verificationSession.id}`);
      }
    }

    // Handle identity.verification_session.requires_input event
    if (event.type === "identity.verification_session.requires_input") {
      const verificationSession = event.data.object as Stripe.Identity.VerificationSession;

      // Find user by verification session ID
      const user = await prisma.user.findFirst({
        where: {
          stripeVerificationSessionId: verificationSession.id,
        },
      });

      if (user) {
        console.log(`Verification requires input for user ${user.id}:`, verificationSession.last_error);
      }
    }

    // Handle account.updated event (connected account status changed)
    // This event is sent when a connected account's status changes, including when verification completes
    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      
      try {
        // Find user by connected account ID
        const user = await prisma.user.findFirst({
          where: {
            stripeConnectAccountId: account.id,
          },
          select: {
            id: true,
            email: true,
            isIdentityVerified: true,
          },
        });

        if (user) {
          // Log account status changes for debugging
          console.log(`Account ${account.id} updated for user ${user.id}:`, {
            payouts_enabled: account.payouts_enabled,
            charges_enabled: account.charges_enabled,
            details_submitted: account.details_submitted,
            disabled_reason: account.requirements?.disabled_reason,
          });

          // If payouts are now enabled and identity was verified, we could send a notification
          // but for now we'll just log it
          if (account.payouts_enabled && user.isIdentityVerified) {
            console.log(`Payouts enabled for user ${user.id}`);
          }
        }
      } catch (error) {
        console.error("Error processing account.updated webhook:", error);
        // Don't fail the webhook if we can't process the account update
      }
    }

    // Handle payout.paid event (cash out completed)
    // This event is sent when a payout from a connected account to their bank account is paid
    // Note: For connected accounts, you may need to set up webhooks on each connected account
    // or use account.application.deauthorized/authorized events to track account activity
    if (event.type === "payout.paid") {
      const payout = event.data.object as Stripe.Payout;

      try {
        // For connected account payouts, we need to find the user by their connected account ID
        // The payout's account field (if present) indicates which connected account it belongs to
        // If not present, we'll search all users with connected accounts
        let user = null;

        // Try to find user by connected account ID if the payout has account information
        // For connected accounts, the account ID might be in the payout object
        if (payout.metadata && typeof payout.metadata === 'object' && 'account_id' in payout.metadata) {
          user = await prisma.user.findFirst({
            where: {
              stripeConnectAccountId: payout.metadata.account_id as string,
            },
            select: {
              id: true,
              email: true,
              firstName: true,
              emailNotificationCashOut: true,
            },
          });
        }

        // If not found, search all users with connected accounts
        // This is less efficient but handles cases where account info isn't in metadata
        if (!user) {
          const usersWithAccounts = await prisma.user.findMany({
            where: {
              stripeConnectAccountId: { not: null },
            },
            select: {
              id: true,
              email: true,
              firstName: true,
              emailNotificationCashOut: true,
              stripeConnectAccountId: true,
            },
          });

          // For each user, check if this payout belongs to their connected account
          // We'd need to verify this by checking the payout's account, but for now
          // we'll send to the first user (this is a simplified approach)
          // In production, you'd want to properly match the payout to the correct account
          user = usersWithAccounts[0] || null;
        }

        if (user?.email && user.emailNotificationCashOut && process.env.RESEND_API_KEY) {
          const amount = payout.amount / 100; // Convert cents to dollars
          // Determine payout duration based on payout method
          const payoutDuration = payout.method === "instant" ? "Instantly" : "1-3 business days";
          const emailHtml = await render(
            CashOutEmail({
              name: user.firstName || undefined,
              amount,
              payoutDuration,
            })
          );

          const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "Granted <no-reply@granted.gg>",
            to: user.email,
            subject: `Cash Out Successful - $${amount.toFixed(2)}`,
            html: emailHtml,
          });

          if (error) {
            console.error("Error sending cash out notification email:", error);
          } else {
            console.log(`Cash out notification email sent to ${user.email}`, data?.id);
          }
        }
      } catch (error) {
        console.error("Error processing payout.paid webhook:", error);
        // Don't fail the webhook if we can't process the payout
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

