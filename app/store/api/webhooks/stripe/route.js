import { NextResponse } from 'next/server';
import { isStripeConfigured, getStripe } from 'lib/stripe';
import { isSupabaseAdminConfigured, createAdminSupabaseClient } from 'lib/supabase/admin';
import { sendOrderConfirmationEmails } from 'lib/store/send-order-emails';

export const runtime = 'nodejs';

// Stripe calls this once a checkout session actually completes. This is the only
// place an order flips to "paid" and stock actually decrements — never the
// client, and never the /store/success page (that's just a redirect target).
export async function POST(request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!isStripeConfigured || !isSupabaseAdminConfigured || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook is not configured.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  const rawBody = await request.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata?.order_id;

    if (orderId) {
      const supabase = createAdminSupabaseClient();

      const { data: order } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          stripe_payment_intent: session.payment_intent,
          customer_email: session.customer_details?.email || null,
          customer_name: session.customer_details?.name || null,
          shipping_address: session.customer_details?.address || null
        })
        .eq('id', orderId)
        .select('*, order_items(*)')
        .single();

      if (order) {
        for (const item of order.order_items) {
          await supabase.rpc('decrement_variant_stock', {
            p_product_slug: item.product_slug,
            p_size: item.size,
            p_quantity: item.quantity
          });
        }
        await sendOrderConfirmationEmails(order).catch((err) => console.error('order confirmation email failed', err));
      }
    }
  }

  return NextResponse.json({ received: true });
}
