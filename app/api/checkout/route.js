import { NextResponse } from 'next/server';
import { findVariant, LENS_UPGRADES } from '../../../data/eyewear';

const SHIPPING_ILS = 29;
const FREE_SHIPPING_ILS = 500;
const PROMO_CODES = { AYIN10: 0.1, HELLO10: 0.1 };
const MAX_QTY = 9;

/**
 * Creates a Stripe Checkout session.
 *
 * Prices are recomputed here from the catalogue: the request only says which
 * variant, which lens option and how many. Anything the browser claims about
 * money is ignored.
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
    if (items.length === 0) {
        return NextResponse.json({ error: 'empty_cart' }, { status: 400 });
    }

    const lang = payload?.lang === 'en' ? 'en' : 'he';
    const currency = lang === 'en' ? 'usd' : 'ils';
    const toMinor = (ils) => Math.round((lang === 'en' ? ils / 3.6 : ils) * 100);

    const lineItems = [];
    let subtotalIls = 0;

    for (const item of items) {
        const found = findVariant(String(item?.variantId ?? ''));
        if (!found) {
            return NextResponse.json({ error: 'unknown_variant' }, { status: 400 });
        }
        const lens = LENS_UPGRADES.find((option) => option.id === item?.lensId) ?? LENS_UPGRADES[0];
        const qty = Math.min(Math.max(Number.parseInt(item?.qty, 10) || 1, 1), MAX_QTY);
        const unitIls = found.product.price + lens.price;
        subtotalIls += unitIls * qty;

        lineItems.push({
            quantity: qty,
            price_data: {
                currency,
                unit_amount: toMinor(unitIls),
                product_data: {
                    name: `${found.product.name[lang]} — ${found.variant.color[lang]}`,
                    description: lens.price > 0 ? lens.label[lang] : found.variant.lens[lang],
                    metadata: { slug: found.product.slug, variant: found.variant.id, lens: lens.id }
                }
            }
        });
    }

    const promo = String(payload?.promo ?? '').trim().toUpperCase();
    const discountRate = PROMO_CODES[promo] ?? 0;
    const discountIls = Math.round(subtotalIls * discountRate);
    const shippingIls = subtotalIls - discountIls >= FREE_SHIPPING_ILS ? 0 : SHIPPING_ILS;

    const origin = request.headers.get('origin') ?? process.env.URL ?? 'http://localhost:3000';

    try {
        const { default: Stripe } = await import('stripe');
        const stripe = new Stripe(secret);

        const discounts = [];
        if (discountIls > 0) {
            const coupon = await stripe.coupons.create({
                amount_off: toMinor(discountIls),
                currency,
                duration: 'once',
                name: promo
            });
            discounts.push({ coupon: coupon.id });
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: lineItems,
            success_url: `${origin}/checkout/done?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/checkout`,
            locale: lang === 'he' ? 'he' : 'en',
            shipping_address_collection: {
                allowed_countries: ['IL', 'US', 'GB', 'DE', 'FR', 'NL', 'CA', 'AU']
            },
            ...(shippingIls > 0 && {
                shipping_options: [
                    {
                        shipping_rate_data: {
                            type: 'fixed_amount',
                            fixed_amount: { amount: toMinor(shippingIls), currency },
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
