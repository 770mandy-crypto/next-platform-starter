import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "lib/stripe";

export async function POST(request) {
  try {
    const body = await request.json();
    const { items, email } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "No items in cart" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Generate order ID
    const orderId = Math.random().toString(36).substring(7);

    // Create Stripe checkout session
    const checkoutSession = await createCheckoutSession(
      items,
      orderId,
      email
    );

    return NextResponse.json({
      orderId: orderId,
      checkoutUrl: checkoutSession.url
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
