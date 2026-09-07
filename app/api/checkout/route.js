import { NextResponse } from 'next/server';
import { getProduct, ILS_TO_USD } from '../../../data/catalogue';
import { FREE_SHIPPING, PROMOS, SHIPPING } from '../../../lib/store/copy';

const MAX_QTY = 9;

/**
 * Creates a Stripe Checkout session.
 *
 * Every figure is recomputed here from the catalogue: the request only says
 * which product and how many. Nothing the browser claims about money is used.
 */
export async function POST(request) {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
        return NextResponse.json(
            { error: 'stripe_not_configured', message: 'STRIPE_SECRET_KEY is not set on this deploy.' },
            { status: 503 }
        );
    }

    let payload;
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    const items = Array.isArray(payload?.items) ? payload.items : [];
    if (items.length === 0) return NextResponse.json({ error: 'empty_bag' }, { status: 400 });

    const lang = payload?.lang === 'en' ? 'en' : 'he';
    const currency = lang === 'en' ? 'usd' : 'ils';
    const minor = (ils) => Math.round((lang === 'en' ? ils * ILS_TO_USD : ils) * 100);

    const lineItems = [];
    let subtotal = 0;

    for (const item of items) {
        const product = getProduct(String(item?.slug ?? ''));
        if (!product) return NextResponse.json({ error: 'unknown_product' }, { status: 400 });
        const qty = Math.min(Math.max(Number.parseInt(item?.qty, 10) || 1, 1), MAX_QTY);
        subtotal += product.price * qty;
        lineItems.push({
            quantity: qty,
            price_data: {
                currency,
                unit_amount: minor(product.price),
                product_data: {
                    name: product.name[lang],
                    description: product.subtitle[lang],
                    metadata: { slug: product.slug }
                }
            }
        });
    }

    const promo = String(payload?.promo ?? '').trim().toUpperCase();
    const rate = PROMOS[promo] ?? 0;
    const discount = Math.round(subtotal * rate);
    const shipping = subtotal - discount >= FREE_SHIPPING ? 0 : SHIPPING;
    const base = request.headers.get('origin') ?? process.env.URL ?? 'http://localhost:3000';

    try {
        const { default: Stripe } = await import('stripe');
        const stripe = new Stripe(secret);

        const discounts = [];
        if (discount > 0) {
            const coupon = await stripe.coupons.create({
                amount_off: minor(discount),
                currency,
                duration: 'once',
                name: promo
            });
            discounts.push({ coupon: coupon.id });
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: lineItems,
            success_url: `${base}/checkout?done=1`,
            cancel_url: `${base}/checkout`,
            locale: lang === 'he' ? 'he' : 'en',
            shipping_address_collection: { allowed_countries: ['IL', 'US', 'GB', 'DE', 'FR', 'NL', 'CA', 'AU'] },
            ...(shipping > 0 && {
                shipping_options: [
                    {
                        shipping_rate_data: {
                            type: 'fixed_amount',
                            fixed_amount: { amount: minor(shipping), currency },
                            display_name: lang === 'he' ? 'משלוח עד הבית' : 'Courier delivery'
                        }
                    }
                ]
            }),
            ...(discounts.length > 0 && { discounts }),
            metadata: { promo: promo || 'none', lang }
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('[checkout] stripe session failed', error);
        return NextResponse.json({ error: 'stripe_error', message: error?.message ?? 'unknown' }, { status: 502 });
    }
}
