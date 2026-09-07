import Link from 'next/link';
import { Scanner } from 'components/bot/scanner';

export const metadata = {
    title: 'סורק מניות — שוקי'
};

export default function ScanPage() {
    return (
        <div dir="rtl" className="flex flex-col gap-8">
            <header className="flex flex-col gap-3">
                <h1>🔍 סורק מניות</h1>
                <p className="max-w-2xl text-lg opacity-80">
                    בחר רשימה, והבוט ינתח כל מניה בה ויציג אותן מדורגות מהחזקה לחלשה. הסריקה רצה באצוות ומתעדכנת תוך
                    כדי — אפשר לעצור אותה בכל רגע.
                </p>
                <p className="opacity-70">
                    לחיצה על סימבול פותחת אותו ב{' '}
                    <Link href="/bot" className="text-primary">
                        אנליסט
                    </Link>{' '}
                    לניתוח מלא, או קפוץ ל
                    <Link href="/market" className="text-primary">
                        מפת השוק
                    </Link>
                    .
                </p>
            </header>

            <Scanner />
        </div>
    );
}
