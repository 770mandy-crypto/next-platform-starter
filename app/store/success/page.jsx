import Link from 'next/link';
import products from 'data/products.json';
import { getStripe } from 'lib/stripe';

export const metadata = {
    title: 'Thank you'
};

// Always render at request time — we need the live session_id from the URL.
export const dynamic = 'force-dynamic';

export default async function SuccessPage({ searchParams }) {
    const params = await searchParams;
    const sessionId = params?.session_id;
    const stripe = getStripe();

    let paid = false;
    let purchasedSlugs = [];
    let customerEmail = null;

    if (stripe && sessionId) {
        try {
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            paid = session.payment_status === 'paid';
            customerEmail = session.customer_details?.email ?? null;
            purchasedSlugs = (session.metadata?.slugs ?? '').split(',').filter(Boolean);
        } catch {
            paid = false;
        }
    }

    const purchased = purchasedSlugs
        .map((slug) => products.find((p) => p.slug === slug))
        .filter(Boolean);

    if (!paid) {
        return (
            <div className="flex flex-col items-center gap-6 py-16 text-center">
                <div className="text-6xl">🤔</div>
                <h1>We couldn&apos;t confirm this payment</h1>
                <p className="max-w-md text-lg text-neutral-300">
                    If you were charged, your download links will arrive by email. Otherwise, head back to the shop and
                    try again.
                </p>
                <Link href="/store" className="btn btn-lg">
                    Back to shop
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-6 py-16 text-center">
            <div className="text-6xl">🎉</div>
            <h1>Thank you for your purchase!</h1>
            <p className="max-w-md text-lg text-neutral-300">
                Your payment went through{customerEmail ? ` — a receipt is on its way to ${customerEmail}` : ''}. Grab
                your downloads below.
            </p>

            {purchased.length > 0 && (
                <div className="flex flex-col w-full max-w-md gap-3 mt-2">
                    {purchased.map((product) => (
                        <a
                            key={product.slug}
                            href={`/downloads/${product.file}`}
                            download
                            className="flex items-center justify-between gap-4 px-5 py-4 no-underline bg-white rounded-sm text-neutral-800 hover:opacity-90"
                        >
                            <span className="flex items-center gap-3">
                                <span className="text-2xl">{product.emoji}</span>
                                <span className="font-semibold text-left">{product.name}</span>
                            </span>
                            <span className="font-bold text-secondary">Download ⤓</span>
                        </a>
                    ))}
                </div>
            )}

            <Link href="/store" className="mt-2 btn btn-lg">
                Continue shopping
            </Link>
        </div>
    );
}
