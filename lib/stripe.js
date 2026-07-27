import Stripe from 'stripe';

let stripeClient = null;

/**
 * Returns a configured Stripe client, or null when STRIPE_SECRET_KEY is not set.
 * Instantiated lazily so the app builds and runs in demo mode without keys.
 */
export function getStripe() {
    if (stripeClient) {
        return stripeClient;
    }
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
        return null;
    }
    stripeClient = new Stripe(key);
    return stripeClient;
}

export function isStripeConfigured() {
    return Boolean(process.env.STRIPE_SECRET_KEY);
}
