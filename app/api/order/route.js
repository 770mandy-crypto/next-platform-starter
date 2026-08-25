import { NextResponse } from 'next/server';
import { products } from 'data/products';

const MAX_QTY = 20;

/**
 * Records an order. No payment is taken here — the shop settles with the
 * customer directly — so this endpoint never blocks the order on a missing
 * database: it prices the cart from the catalogue, logs it, and stores it
 * only when Supabase is actually configured.
 */
export async function POST(request) {
    try {
        const { orderId, customer, items } = await request.json();

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'ההזמנה ריקה' }, { status: 400 });
        }

        // Prices come from the catalogue, never from the request body.
        const lines = items.map((item) => {
            const product = products.find((p) => p.slug === item.slug);
            if (!product) throw new Error(`Unknown product: ${item.slug}`);

            const quantity = Number(item.quantity);
            if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
                throw new Error(`Invalid quantity for ${product.slug}`);
            }
            if (item.size && !product.sizes.includes(item.size)) {
                throw new Error(`Invalid size for ${product.slug}`);
            }

            return { slug: product.slug, title: product.titleHe, price: product.price, size: item.size ?? null, quantity };
        });

        const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);

        console.info('[order]', orderId, customer?.name, customer?.phone, total, lines);

        let stored = false;
        if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            try {
                const { createOrder } = await import('lib/supabase');
                await createOrder(null, customer.email, customer.name, total, lines);
                stored = true;
            } catch (error) {
                console.error('[order] could not store:', error.message);
            }
        }

        return NextResponse.json({ orderId, total, stored });
    } catch (error) {
        console.error('[order] rejected:', error.message);
        return NextResponse.json({ error: 'ההזמנה אינה תקינה' }, { status: 400 });
    }
}
