import { discountedPrice, findPlan, offer } from 'lib/offer-config';

// Creates a Stripe Checkout session for one plan and returns its URL.
// The price is always worked out here on the server from the plan id, so a
// visitor cannot change what they pay by editing the page.
export async function POST(request) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        return Response.json(
            { error: 'התשלום עוד לא הוגדר: חסר STRIPE_SECRET_KEY בהגדרות האתר.' },
            { status: 503 }
        );
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    }

    const plan = findPlan(body?.planId);
    if (!plan) {
        return Response.json({ error: 'תוכנית לא קיימת' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || new URL(request.url).origin;
    const params = new URLSearchParams({
        mode: 'payment',
        locale: 'auto',
        success_url: `${origin}/offer/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/offer`,
        'line_items[0][quantity]': '1',
        'line_items[0][price_data][currency]': offer.currency,
        'line_items[0][price_data][unit_amount]': String(discountedPrice(plan)),
        'line_items[0][price_data][product_data][name]': `${offer.brand} – ${plan.name}`,
        'metadata[plan]': plan.id
    });

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
    });
    const data = await res.json();
    if (!res.ok) {
        console.error('Stripe checkout failed', data?.error?.message);
        return Response.json({ error: 'לא הצלחנו לפתוח את דף התשלום. נסו שוב.' }, { status: 502 });
    }
    return Response.json({ url: data.url });
}
