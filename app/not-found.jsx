import Link from 'next/link';

// Handles URLs that match no route at all. Route-level notFound() calls inside the
// boutique are caught by app/(store)/not-found.jsx, which keeps the store chrome.
export default function NotFound() {
    return (
        <div className="store flex flex-col items-center justify-center min-h-screen px-6 text-center">
            <p className="eyebrow">404</p>
            <h1 className="mt-3">הדף הזה לא נמצא</h1>
            <p className="max-w-md mt-4 text-mocha">
                יכול להיות שהקישור השתנה או שהפריט אזל. הקולקציה המלאה מחכה בחנות.
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
