import 'server-only'
import Stripe from 'stripe';

const apiKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is missing. Using placeholder for build/dev. Stripe calls will fail.');
}

export const stripe = new Stripe(apiKey, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
});
