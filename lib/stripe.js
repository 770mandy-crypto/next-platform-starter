import Stripe from "stripe";
import { PAYMENTS_ENABLED } from "lib/payments";

/**
 * Absolute origin for Stripe's return URLs. Stripe rejects a session whose
 * success_url is not a valid absolute URL, so an unset NEXTAUTH_URL would
 * break checkout outright; Vercel's own variables cover the deployed case.
 */
function siteOrigin() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    "http://localhost:3000"
  );
}

let client = null;

// Created on first use, not at module load, so the app builds and runs
// without STRIPE_SECRET_KEY set. Only checkout needs the key.
export function getStripe() {
  // Second line of defence: a direct call cannot reach Stripe either.
  if (!PAYMENTS_ENABLED) {
    throw new Error("Payments are disabled (see lib/payments.js)");
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-04-10"
    });
  }
  return client;
}

export const stripe = new Proxy(
  {},
  {
    get(_target, prop) {
      return Reflect.get(getStripe(), prop);
    }
  }
);

export async function createCheckoutSession(items, orderId, email) {
  const lineItems = items.map((item) => ({
    price_data: {
      currency: "ils",
      product_data: {
        name: item.name
      },
      unit_amount: Math.round(item.price * 100)
    },
    quantity: item.quantity
  }));

  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    success_url: `${siteOrigin()}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
    cancel_url: `${siteOrigin()}/checkout/cancel?order_id=${orderId}`,
    customer_email: email,
    metadata: {
      orderId
    }
  });

  return session;
}
