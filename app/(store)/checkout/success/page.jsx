import Link from 'next/link';

export const metadata = {
    title: 'ההזמנה התקבלה'
};

export default function CheckoutSuccessPage({ searchParams }) {
    const orderId = searchParams.order_id;

    return (
        <div className="px-6 py-16 mx-auto max-w-4xl sm:px-10 sm:py-24 text-center">
            <div className="mb-8">
                <div className="text-6xl mb-4">✓</div>
                <h1 className="text-4xl font-bold mb-4">ההזמנה התקבלה בהצלחה!</h1>
                <p className="text-muted text-lg mb-4">
                    תודה על ההזמנה שלך. תקבל אישור בדואר האלקטרוני שלך תוך רגעים.
                </p>

                {orderId && (
                    <p className="text-sm text-muted mb-8">
                        מס' הזמנה: <span className="font-mono">{orderId}</span>
                    </p>
                )}

                <div className="space-y-3">
                    <p className="text-muted">
                        משלוח חינם מעל ₪350 · החזרה חינם עד 30 יום
                    </p>
                </div>
            </div>

            <div className="flex gap-4 justify-center mt-12">
                <Link href="/shop" className="btn-gold">
                    חזור לחנות
                </Link>
                <Link href="/" className="btn-line">
                    לעמוד הבית
                </Link>
            </div>
        </div>
    );
}
