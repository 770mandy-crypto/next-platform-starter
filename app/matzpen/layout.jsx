import { Nav } from 'components/matzpen/nav';
import { loadDataset } from 'lib/nadlan/dataset';

export const metadata = {
    title: { template: '%s | מצפן נדל״ן', default: 'מצפן נדל״ן – איפה כדאי לקנות דירה בישראל' },
    description: 'מפת שכונות לכל הארץ עם ציון צמיחה לכל שכונה מנתוני עסקאות אמיתיים, סוכן AI שממליץ איפה לקנות, ודירות למכירה ישירות מבעלי הדירות.'
};

export default async function MatzpenLayout({ children }) {
    const data = await loadDataset();
    return (
        <div dir="rtl" lang="he" className="font-hebrew flex min-h-[100dvh] flex-col bg-slate-50 pb-16 text-slate-900 md:pb-0">
            <Nav />
            {data.isSample && (
                <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
                    ⚠️ גרסת הדגמה: ייבוא הנתונים האמיתיים עוד לא רץ, ולכן המספרים כרגע הם <b>נתוני דוגמה</b>.{' '}
                    <a href="/matzpen/data" className="font-bold text-amber-900">
                        על הנתונים
                    </a>
                </div>
            )}
            <div className="flex-1">{children}</div>
            <footer className="hidden border-t border-slate-200 px-4 py-6 text-center text-xs text-slate-500 md:block">
                מצפן נדל״ן · הנתונים מבוססים על עסקאות מרשות המסים (nadlan.gov.il) ומדדי הלמ״ס · המידע אינו מהווה ייעוץ השקעות ·{' '}
                <a href="/matzpen/terms">תנאי שימוש ופרטיות</a>
            </footer>
        </div>
    );
}
