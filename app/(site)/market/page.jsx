import Link from 'next/link';
import { MarketMap } from 'components/bot/market-map';

export const metadata = {
    title: 'מפת השוק — שוקי'
};

export default function MarketPage() {
    return (
        <div dir="rtl" className="flex flex-col gap-8">
            <header className="flex flex-col gap-3">
                <h1>🗺️ מפת השוק</h1>
                <p className="max-w-2xl text-lg opacity-80">
                    תמונת מצב של השוק כולו: המדדים המרכזיים, כל אחד עשר הסקטורים מדורגים מהחזק לחלש, ומדד רוחב שוק
                    שמראה כמה מהשוק באמת משתתף בתנועה.
                </p>
                <p className="opacity-70">
                    רוצה לנתח נייר ספציפי?{' '}
                    <Link href="/bot" className="text-primary">
                        עבור לאנליסט
                    </Link>
                    .
                </p>
            </header>

            <MarketMap />
        </div>
    );
}
