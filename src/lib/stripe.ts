import 'server-only'
import Stripe from 'stripe';

const apiKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is missing. Using placeholder for build/dev. Stripe calls will fail.');
}

export const stripe = new Stripe(apiKey, {
  apiVersion: '2026-01-28.clover',
  typescript: true,
});

// Platform cut on destination-charge payments (Stripe Connect
// application_fee_amount), as a percentage of the amount. Rounds down so the
// platform never takes more than the configured rate.
export function calculatePlatformFeeAmount(amountInCents: number): number {
  const feePercent = Number(process.env.PLATFORM_FEE_PERCENT) || 0;
  if (feePercent <= 0) return 0;
  return Math.floor((amountInCents * feePercent) / 100);
}
