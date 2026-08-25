import { NextResponse } from "next/server";
import { stripe } from "lib/stripe";
import { PAYMENTS_ENABLED, paymentsDisabledResponse } from "lib/payments";

export async function POST(request) {
  // No payments are taken, so there are no genuine Stripe events to process.
  if (!PAYMENTS_ENABLED) {
    return paymentsDisabledResponse();
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature" },
      { status: 400 }
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log("Payment successful for order:", session.metadata?.orderId);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        console.log("Refund processed for order:", charge.metadata?.orderId);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
