import { NextResponse } from 'next/server';
import products from 'data/products.json';
import { getStripe } from 'lib/stripe';

// Prices come from our trusted catalog on the server, never from the client,
// so a tampered request can't change what the customer is charged.
export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const requestedItems = Array.isArray(body?.items) ? body.items : [];
    if (requestedItems.length === 0) {
        return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Map the client cart onto real catalog products and validate quantities.
    const lineItems = [];
    for (const requested of requestedItems) {
        const product = products.find((p) => p.slug === requested.slug);
        const quantity = Number.parseInt(requested.quantity, 10);
        if (!product || !Number.isFinite(quantity) || quantity < 1) {
            return NextResponse.json({ error: `Invalid cart item: ${requested?.slug}` }, { status: 400 });
        }
        lineItems.push({ product, quantity });
    }

    const stripe = getStripe();

    // Demo mode: no Stripe keys configured yet. Tell the client to show the
    // built-in confirmation so the store still works out of the box.
    if (!stripe) {
        return NextResponse.json({ demo: true });
    }

    const origin = request.headers.get('origin') ?? new URL(request.url).origin;

    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: lineItems.map(({ product, quantity }) => ({
                quantity,
                price_data: {
                    currency: 'usd',
                    unit_amount: Math.round(product.price * 100),
                    product_data: {
                        name: product.name,
                        description: product.tagline,
                        metadata: { slug: product.slug }
                    }
                }
            })),
            // Digital goods: collect email for delivery, skip shipping address.
            billing_address_collection: 'auto',
            metadata: {
                slugs: lineItems.map(({ product }) => product.slug).join(',')
            },
            success_url: `${origin}/store/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/store/cart`
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        return NextResponse.json({ error: 'Unable to start checkout' }, { status: 500 });
    }
}
