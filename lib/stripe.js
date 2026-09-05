import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;

export const isStripeConfigured = Boolean(secretKey);

let stripeClient = null;

// Server-only. Throws if called before STRIPE_SECRET_KEY is set — callers check
// isStripeConfigured first and show a setup notice instead.
export function getStripe() {
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set.');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
}
