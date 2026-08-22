import Link from 'next/link';
import { BrandMark } from 'components/store/brand-mark';

// Handles URLs that match no route at all. Route-level notFound() calls inside the
// store are caught by app/(store)/not-found.jsx, which keeps the store chrome.
export default function NotFound() {
    return (
        <div
            className="store flex flex-col items-center justify-center min-h-screen px-6 text-center"
            style={{ background: 'var(--color-ink)' }}
        >
            <BrandMark scale={0.9} />
            <p className="mt-14 eyebrow">404</p>
            <h1 className="mt-4">הדף הזה לא נמצא</h1>
            <p className="max-w-md mt-5 text-muted">
                יכול להיות שהקישור השתנה או שהפריט אזל. הקולקציה המלאה כאן.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-10">
                <Link href="/shop" className="btn-gold">
                    לקולקציה
                </Link>
                <Link href="/" className="btn-line">
                    לדף הבית
                </Link>
            </div>
        </div>
    );
}
