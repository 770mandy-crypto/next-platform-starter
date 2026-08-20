import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-04-10"
});

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

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    success_url: `${process.env.NEXTAUTH_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
    cancel_url: `${process.env.NEXTAUTH_URL}/checkout/cancel?order_id=${orderId}`,
    customer_email: email,
    metadata: {
      orderId
    }
  });

  return session;
}
