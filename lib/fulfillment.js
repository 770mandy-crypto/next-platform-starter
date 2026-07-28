/**
 * Order fulfillment layer.
 *
 * After a payment succeeds, we hand the order — items + the customer's shipping
 * address — to a fulfillment partner who picks, packs, and ships directly to the
 * buyer. The store owner never touches inventory or a post office.
 *
 * Pick a provider with the FULFILLMENT_PROVIDER env var:
 *   - "webhook"  → POST the order to FULFILLMENT_WEBHOOK_URL (any supplier,
 *                  3PL, or automation like Zapier/Make/n8n).
 *   - "printful" → send the order straight to the Printful API
 *                  (print-on-demand; they produce and ship for you).
 *   - unset      → demo mode: the order is logged, nothing is sent.
 *
 * Every provider returns { ok, provider, reference?, error? } and never throws,
 * so a fulfillment hiccup never breaks the payment flow.
 */

export async function fulfillOrder(order) {
    const provider = (process.env.FULFILLMENT_PROVIDER || '').toLowerCase();

    try {
        switch (provider) {
            case 'webhook':
                return await fulfillViaWebhook(order);
            case 'printful':
                return await fulfillViaPrintful(order);
            default:
                return fulfillDemo(order);
        }
    } catch (error) {
        console.error(`[fulfillment] ${provider || 'demo'} failed:`, error);
        return { ok: false, provider: provider || 'demo', error: error.message };
    }
}

/** No provider configured — just log so the flow is visible in development. */
function fulfillDemo(order) {
    console.log('[fulfillment] DEMO — order would be sent to a shipping partner:', {
        orderId: order.orderId,
        email: order.email,
        items: order.items.map((i) => `${i.quantity}× ${i.slug}`),
        shipTo: order.shipping?.name
    });
    return { ok: true, provider: 'demo', reference: `demo_${order.orderId}` };
}

/**
 * Forward the whole order to a configurable URL. This is the most flexible
 * "hands-off" option: point it at your supplier's intake endpoint or an
 * automation that creates the fulfillment order for you.
 */
async function fulfillViaWebhook(order) {
    const url = process.env.FULFILLMENT_WEBHOOK_URL;
    if (!url) {
        throw new Error('FULFILLMENT_WEBHOOK_URL is not set');
    }

    const headers = { 'Content-Type': 'application/json' };
    // Optional shared secret so your endpoint can verify the request is from us.
    if (process.env.FULFILLMENT_WEBHOOK_SECRET) {
        headers['X-Fulfillment-Secret'] = process.env.FULFILLMENT_WEBHOOK_SECRET;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(order)
    });

    if (!response.ok) {
        throw new Error(`Webhook responded ${response.status}`);
    }
    return { ok: true, provider: 'webhook', reference: order.orderId };
}

/**
 * Create a Printful order. Requires PRINTFUL_API_KEY and each product to carry a
 * `printfulVariantId` in the catalog (the synced variant to produce).
 */
async function fulfillViaPrintful(order) {
    const apiKey = process.env.PRINTFUL_API_KEY;
    if (!apiKey) {
        throw new Error('PRINTFUL_API_KEY is not set');
    }

    const items = order.items
        .filter((item) => item.printfulVariantId)
        .map((item) => ({ sync_variant_id: item.printfulVariantId, quantity: item.quantity }));

    if (items.length === 0) {
        throw new Error('No items have a printfulVariantId — cannot fulfill via Printful');
    }

    const ship = order.shipping ?? {};
    const response = await fetch('https://api.printful.com/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            external_id: order.orderId,
            confirm: true, // auto-submit for fulfillment, no manual approval
            recipient: {
                name: ship.name,
                email: order.email,
                address1: ship.address?.line1,
                address2: ship.address?.line2,
                city: ship.address?.city,
                state_code: ship.address?.state,
                country_code: ship.address?.country,
                zip: ship.address?.postal_code
            },
            items
        })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(`Printful responded ${response.status}: ${data?.error?.message ?? 'unknown error'}`);
    }
    return { ok: true, provider: 'printful', reference: String(data?.result?.id ?? order.orderId) };
}
