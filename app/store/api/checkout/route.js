import { NextResponse } from 'next/server';
import { isSupabaseAdminConfigured, createAdminSupabaseClient } from 'lib/supabase/admin';
import { isStripeConfigured, getStripe } from 'lib/stripe';
import { getCurrentUser } from 'lib/store/current-user';

export const runtime = 'nodejs';

// Never trust price/stock numbers coming from the browser cart — this route
// re-reads both from the database before creating anything Stripe will charge for.
export async function POST(request) {
  if (!isSupabaseAdminConfigured || !isStripeConfigured) {
    return NextResponse.json({ error: 'החנות עוד לא מוגדרת לתשלומים. ראו STORE_SETUP.md.' }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const cartLines = Array.isArray(body?.lines) ? body.lines : [];
  if (cartLines.length === 0) {
    return NextResponse.json({ error: 'העגלה ריקה.' }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const slugs = [...new Set(cartLines.map((l) => l.slug))];
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*, product_variants(size, stock)')
    .in('slug', slugs);

  if (productsError) {
    return NextResponse.json({ error: 'שגיאה בטעינת המוצרים.' }, { status: 500 });
  }

  const validatedLines = [];
  for (const cartLine of cartLines) {
    const product = products.find((p) => p.slug === cartLine.slug);
    if (!product) {
      return NextResponse.json({ error: `הפריט ${cartLine.title || cartLine.slug} כבר לא קיים.` }, { status: 409 });
    }
    const variant = (product.product_variants || []).find((v) => v.size === cartLine.size);
    const quantity = Math.max(1, Math.min(20, Number(cartLine.quantity) || 1));
    if (!variant || variant.stock < quantity) {
      return NextResponse.json(
        { error: `אין מספיק מלאי עבור ${product.title} · מידה ${cartLine.size}. במלאי: ${variant?.stock ?? 0}.` },
        { status: 409 }
      );
    }
    validatedLines.push({ product, size: cartLine.size, quantity });
  }

  const subtotal = validatedLines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
  const { user } = await getCurrentUser();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: user?.id || null,
      customer_email: user?.email || null,
      status: 'pending',
      subtotal,
      total: subtotal,
      currency: 'ils'
    })
    .select()
    .single();

  if (orderError) {
    return NextResponse.json({ error: 'לא הצלחנו ליצור הזמנה.' }, { status: 500 });
  }

  const { error: itemsError } = await supabase.from('order_items').insert(
    validatedLines.map((l) => ({
      order_id: order.id,
      product_slug: l.product.slug,
      title: l.product.title,
      color: l.product.color,
      size: l.size,
      unit_price: l.product.price,
      quantity: l.quantity
    }))
  );

  if (itemsError) {
    return NextResponse.json({ error: 'לא הצלחנו לשמור את פריטי ההזמנה.' }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: validatedLines.map((l) => ({
      quantity: l.quantity,
      price_data: {
        currency: 'ils',
        unit_amount: l.product.price * 100,
        product_data: {
          name: `${l.product.title} · מידה ${l.size}`,
          images: [`${origin}${l.product.image_path}`]
        }
      }
    })),
    customer_email: user?.email || undefined,
    shipping_address_collection: { allowed_countries: ['IL'] },
    metadata: { order_id: order.id },
    success_url: `${origin}/store/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/store/cart?canceled=1`
  });

  await supabase.from('orders').update({ stripe_session_id: session.id }).eq('id', order.id);

  return NextResponse.json({ url: session.url });
}
