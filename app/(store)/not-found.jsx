import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="px-6 py-24 mx-auto text-center max-w-2xl">
            <p className="eyebrow">404</p>
            <h1 className="mt-3">הדף הזה לא נמצא</h1>
            <p className="mt-4 text-mocha">
                יכול להיות שהפריט אזל מהמלאי או שהקישור השתנה. הקולקציה המלאה מחכה בחנות.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
                <Link href="/shop" className="btn-clay">
                    לקולקציה
                </Link>
                <Link href="/" className="btn-ghost">
                    לדף הבית
                </Link>
            </div>
        </div>
    );
}
