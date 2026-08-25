import { NextResponse } from "next/server";
import { createCheckoutSession } from "lib/stripe";
import { createOrder } from "lib/supabase";
import { products } from "data/products";
import { PAYMENTS_ENABLED, paymentsDisabledResponse } from "lib/payments";

const MAX_QTY = 20;

/**
 * Rebuild every cart line from the server-side catalogue.
 *
 * The browser posts its own cart, prices included. Those numbers can be edited
 * before the request is sent, so they are discarded here: the slug is the only
 * field trusted from the client, and price, name and size validity all come
 * from `data/products`.
 */
function resolveLines(items) {
  return items.map((item) => {
    const product = products.find((p) => p.slug === item.slug);
    if (!product) {
      throw new Error(`Unknown product: ${item.slug}`);
    }

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
      throw new Error(`Invalid quantity for ${product.slug}`);
    }

    const size = item.size ?? null;
    if (size && !product.sizes.includes(size)) {
      throw new Error(`Invalid size for ${product.slug}`);
    }

    return {
      slug: product.slug,
      name: size ? `${product.titleHe} · מידה ${size}` : product.titleHe,
      price: product.price,
      size,
      quantity
    };
  });
}

export async function POST(request) {
  // Nothing below runs while payments are off: no Stripe call, no order row.
  if (!PAYMENTS_ENABLED) {
    return paymentsDisabledResponse();
  }

  let lines;

  try {
    const { items, email } = await request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "הסל ריק" }, { status: 400 });
    }
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "נא להזין כתובת אימייל תקינה" }, { status: 400 });
    }

    lines = resolveLines(items);

    const token = request.cookies.get("auth-token")?.value;
    let userId = null;
    if (token) {
      try {
        userId = JSON.parse(atob(token)).id ?? null;
      } catch {
        userId = null; // a malformed cookie means guest checkout, not a failed order
      }
    }

    const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);

    const order = await createOrder(userId, email, email.split("@")[0], total, lines);
    const checkoutSession = await createCheckoutSession(lines, order.id, email);
    return NextResponse.json({ orderId: order.id, checkoutUrl: checkoutSession.url, total });
  } catch (error) {
    // Validation problems are the caller's to fix and safe to name; anything else stays generic.
    if (!lines) {
      console.error("Checkout validation failed:", error.message);
      return NextResponse.json({ error: "בקשת התשלום אינה תקינה" }, { status: 400 });
    }
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "יצירת התשלום נכשלה. נסו שוב." }, { status: 500 });
  }
}
