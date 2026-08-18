import Link from 'next/link';
import { BrandMark } from 'components/store/brand-mark';

export default function NotFound() {
    return (
        <div className="px-6 py-32 mx-auto text-center max-w-2xl sm:px-10">
            <BrandMark scale={0.75} className="mx-auto" variant="monogram" />
            <p className="mt-12 eyebrow">404</p>
            <h1 className="mt-4">הדף הזה לא נמצא</h1>
            <p className="mt-5 text-muted">
                יכול להיות שהפריט אזל מהסדרה או שהקישור השתנה. הקולקציה המלאה כאן.
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
