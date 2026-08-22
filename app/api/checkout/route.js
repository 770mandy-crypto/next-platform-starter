import { NextResponse } from "next/server";
import { createCheckoutSession } from "lib/stripe";
import { createOrder } from "lib/supabase";

export async function POST(request) {
  try {
    const body = await request.json();
    const { items, email } = body;
    const token = request.cookies.get('auth-token')?.value;

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

    // Parse user from token if authenticated
    let userId = null;
    if (token) {
      const user = JSON.parse(atob(token));
      userId = user.id;
    }

    // Calculate total
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Create order in database
    const order = await createOrder(
      userId,
      email,
      email.split('@')[0],
      total,
      items
    );

    // Create Stripe checkout session
    const checkoutSession = await createCheckoutSession(
      items,
      order.id,
      email
    );

    return NextResponse.json({
      orderId: order.id,
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
