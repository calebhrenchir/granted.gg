import { prisma } from "./prisma";
import { centsToDollars, dollarsToCents, calculateSellerEarnings } from "./stripe";

/**
 * Creates an activity and updates the link's aggregated totals atomically
 * @param linkId - The ID of the link
 * @param type - The type of activity ("click" or "purchase")
 * @param amountInCents - The base amount in cents (only for purchases, before seller fee deduction)
 * @param stripePaymentIntentId - The Stripe Payment Intent ID (only for purchases)
 * @param platformFeePercent - The platform fee percentage (e.g., 20 for 20%)
 * @param customerEmail - The customer email (only for purchases)
 */
export async function createActivityAndUpdateTotals(
  linkId: string,
  type: "click" | "purchase",
  amountInCents?: number,
  stripePaymentIntentId?: string,
  platformFeePercent?: number,
  customerEmail?: string
) {
  return await prisma.$transaction(async (tx) => {
    // Create the activity
    const activity = await tx.activity.create({
      data: {
        linkId,
        type,
        amount: type === "purchase" && amountInCents !== undefined ? amountInCents : null,
        platformFee: type === "purchase" && platformFeePercent !== undefined ? platformFeePercent : null,
        stripePaymentIntentId: type === "purchase" ? stripePaymentIntentId : null,
        customerEmail: type === "purchase" ? customerEmail || null : null,
      },
    });

    console.log(activity);

    // Update link totals based on activity type
    if (type === "purchase" && amountInCents !== undefined) {
      // Calculate seller earnings after deducting seller fee (half of platform fee)
      const feePercent = platformFeePercent ?? 20; // Default to 20% if not provided
      const sellerEarningsInCents = calculateSellerEarnings(amountInCents, feePercent);
      
      // Convert cents to dollars for totalEarnings (which is stored as Decimal in dollars)
      const sellerEarningsInDollars = centsToDollars(sellerEarningsInCents);
      
      await tx.link.update({
        where: { id: linkId },
        data: {
          totalSales: { increment: 1 },
          totalEarnings: { increment: sellerEarningsInDollars }, // Increment seller earnings (after fee)
        },
      });
    } else if (type === "click") {
      await tx.link.update({
        where: { id: linkId },
        data: {
          totalClicks: { increment: 1 },
        },
      });
    }

    return activity;
  });
}

/**
 * Recalculates totals from activities (useful for data integrity checks)
 * @param linkId - The ID of the link
 */
export async function recalculateLinkTotals(linkId: string) {
  const activities = await prisma.activity.findMany({
    where: { linkId },
  });

  const totals = activities.reduce(
    (acc, activity) => {
      if (activity.type === "click") {
        acc.clicks += 1;
      } else if (activity.type === "purchase" && activity.amount !== null) {
        acc.sales += 1;
        // Convert cents to dollars for totalEarnings (which is stored as Decimal in dollars)
        acc.earnings += centsToDollars(activity.amount);
      }
      return acc;
    },
    { clicks: 0, sales: 0, earnings: 0 }
  );

  await prisma.link.update({
    where: { id: linkId },
    data: {
      totalClicks: totals.clicks,
      totalSales: totals.sales,
      totalEarnings: totals.earnings, // Store in dollars (Decimal)
    },
  });

  return {
    clicks: totals.clicks,
    sales: totals.sales,
    earnings: centsToDollars(totals.earnings), // Return earnings in dollars
  };
}

