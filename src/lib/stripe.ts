import Stripe from "stripe";

function getStripeInstance(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Please add it to your .env file.\n" +
      "Get your Stripe API keys from: https://dashboard.stripe.com/apikeys\n" +
      "For testing, use a test key that starts with 'sk_test_'"
    );
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-12-15.clover",
    typescript: true,
  });
}

// Lazy initialization - only creates instance when accessed
let stripeInstance: Stripe | null = null;

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    if (!stripeInstance) {
      stripeInstance = getStripeInstance();
    }
    return (stripeInstance as any)[prop];
  },
});

/**
 * Calculate the total price with buyer fee (half of platform fee)
 * @param basePriceInCents - The base price in cents
 * @param platformFeePercent - The platform fee percentage (e.g., 20 for 20%)
 * @returns The total price in cents (base + buyer fee)
 */
export function calculatePriceWithFee(basePriceInCents: number, platformFeePercent: number = 20): number {
  // Buyer pays half of the platform fee (e.g., 10% if platform fee is 20%)
  const buyerFeePercent = platformFeePercent / 2;
  const fee = Math.round(basePriceInCents * (buyerFeePercent / 100));
  return basePriceInCents + fee;
}

/**
 * Calculate the seller earnings after deducting seller fee (half of platform fee)
 * @param basePriceInCents - The base price in cents
 * @param platformFeePercent - The platform fee percentage (e.g., 20 for 20%)
 * @returns The seller earnings in cents (base - seller fee)
 */
export function calculateSellerEarnings(basePriceInCents: number, platformFeePercent: number = 20): number {
  // Seller receives base price minus half of the platform fee (e.g., 90% if platform fee is 20%)
  const sellerFeePercent = platformFeePercent / 2;
  const fee = Math.round(basePriceInCents * (sellerFeePercent / 100));
  return basePriceInCents - fee;
}

/**
 * Convert dollars to cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

