import Link from 'next/link';

export const metadata = {
    title: 'ההזמנה בוטלה'
};

export default function CheckoutCancelPage({ searchParams }) {
    const orderId = searchParams.order_id;

    return (
        <div className="px-6 py-16 mx-auto max-w-4xl sm:px-10 sm:py-24 text-center">
            <div className="mb-8">
                <div className="text-6xl mb-4">✕</div>
                <h1 className="text-4xl font-bold mb-4">ההזמנה בוטלה</h1>
                <p className="text-muted text-lg mb-4">
                    התשלום לא בוצע. אתה יכול לנסות שוב או לחזור לחנות.
                </p>

                {orderId && (
                    <p className="text-sm text-muted mb-8">
                        מס' הזמנה: <span className="font-mono">{orderId}</span>
                    </p>
                )}
            </div>

            <div className="flex gap-4 justify-center mt-12">
                <Link href="/cart" className="btn-gold">
                    חזור לעגלה
                </Link>
                <Link href="/shop" className="btn-line">
                    המשך קנייה
                </Link>
            </div>
        </div>
    );
}
