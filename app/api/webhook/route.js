import { NextResponse } from 'next/server';
import products from 'data/products.json';
import { getStripe } from 'lib/stripe';
import { fulfillOrder } from 'lib/fulfillment';

// Stripe signs webhooks against the raw request body, so it must not be parsed.
export const dynamic = 'force-dynamic';

export async function POST(request) {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Without Stripe + a signing secret there is nothing to verify against.
    if (!stripe || !webhookSecret) {
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
    }

    const signature = request.headers.get('stripe-signature');
    const rawBody = await request.text();

    let event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
        console.error('[webhook] signature verification failed:', error.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        // Rebuild the order from the items we stamped onto the session at checkout.
        let requestedItems = [];
        try {
            requestedItems = JSON.parse(session.metadata?.items ?? '[]');
        } catch {
            requestedItems = [];
        }

        const items = requestedItems
            .map(({ slug, quantity }) => {
                const product = products.find((p) => p.slug === slug);
                if (!product) {
                    return null;
                }
                return {
                    slug: product.slug,
                    name: product.name,
                    quantity,
                    printfulVariantId: product.printfulVariantId ?? null
                };
            })
            .filter(Boolean);

        const ship = session.shipping_details ?? session.collected_information?.shipping_details ?? null;

        const order = {
            orderId: session.id,
            email: session.customer_details?.email ?? null,
            items,
            shipping: ship ? { name: ship.name, address: ship.address } : null
        };

        // Hand the order to the shipping partner. Never let a fulfillment error
        // fail the webhook — that would make Stripe retry a paid order forever.
        const result = await fulfillOrder(order);
        if (!result.ok) {
            console.error('[webhook] fulfillment failed for', order.orderId, result.error);
        } else {
            console.log('[webhook] order sent to', result.provider, '→', result.reference);
        }
    }

    return NextResponse.json({ received: true });
}
