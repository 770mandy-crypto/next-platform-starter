import { formatMonth, formatPct } from 'components/matzpen/format';
import { CITIES } from 'lib/nadlan/cities';
import { loadDataset } from 'lib/nadlan/dataset';
import { WEIGHTS } from 'lib/nadlan/score';
import { getDb } from 'lib/pilot/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'על הנתונים' };

const when = (ms) => (ms ? new Date(ms).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' }) : '—');

export default async function DataPage() {
    const data = await loadDataset();
    const meta = await getDb()
        .then((db) => db.get('matzpen/meta'))
        .catch(() => null);

    return (
        <main className="mx-auto max-w-3xl space-y-6 p-4">
            <h1 className="text-2xl font-black">על הנתונים</h1>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="mb-2 text-lg font-black">מצב נוכחי</h2>
                {data.isSample ? (
                    <p className="text-amber-800">ייבוא הנתונים האמיתיים עוד לא הושלם, ולכן מוצגים נתוני דוגמה. הייבוא רץ אוטומטית כל 30 דקות באתר החי.</p>
                ) : (
                    <ul className="space-y-1 text-sm">
                        <li>
                            עודכן לאחרונה: <b>{when(data.updatedAt)}</b>
                        </li>
                        <li>
                            <b>{data.cities.length}</b> ערים, <b>{data.areas.length}</b> שכונות
                        </li>
                        {data.national && (
                            <li>
                                מדד מחירי הדירות של הלמ״ס, 12 חודשים עד {formatMonth(data.national.month)}: <b dir="ltr">{formatPct(data.national.change12m)}</b>
                            </li>
                        )}
                    </ul>
                )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-relaxed">
                <h2 className="mb-2 text-lg font-black">מאיפה הנתונים</h2>
                <ul className="list-disc space-y-1 pr-5">
                    <li>
                        <b>מחירים ומגמות:</b> מחירים חציוניים של עסקאות אמיתיות שדווחו לרשות המסים, כפי שמתפרסמים באתר{' '}
                        <a href="https://www.nadlan.gov.il">nadlan.gov.il</a>, לכל עיר ושכונה ולפי מספר חדרים.
                    </li>
                    <li>
                        <b>מדדים:</b> מדד מחירי הדירות ומדד שכר הדירה של <a href="https://www.cbs.gov.il">הלשכה המרכזית לסטטיסטיקה</a>. מחירי השכירות ב-nadlan.gov.il לא
                        מתעדכנים מאז 2021, ולכן אנחנו מעדכנים אותם לפי מדד שכר הדירה.
                    </li>
                    <li>
                        <b>מיקום במפה:</b> שירות איתור כתובות (Google או OpenStreetMap). שכונה שלא נמצא לה מיקום מוצגת בדירוג בלבד.
                    </li>
                    <li>
                        <b>מנועי צמיחה</b> (רכבת קלה, פינוי-בינוי וכו׳): נאספים ידנית ממקורות רשמיים. איפה שעוד לא נאספו, הם לא נספרים בציון, והסוכן יכול לחפש חדשות עדכניות.
                    </li>
                </ul>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-relaxed">
                <h2 className="mb-2 text-lg font-black">איך מחושב ציון הצמיחה (0–100)</h2>
                <ul className="list-disc space-y-1 pr-5">
                    <li>מגמת מחיר בשנה האחרונה: עד {WEIGHTS.momentum} נקודות</li>
                    <li>מגמת מחיר ב-3 שנים: עד {WEIGHTS.longTerm}</li>
                    <li>כמה השכונה זולה מהחציון בעיר: עד {WEIGHTS.gap}</li>
                    <li>תשואה משכירות: עד {WEIGHTS.yield}</li>
                    <li>מנועי צמיחה: עד {WEIGHTS.signals}</li>
                    <li>כל סיכון: מינוס {WEIGHTS.riskPenalty}</li>
                </ul>
                <p className="mt-2">
                    חלקים שאין להם נתונים לא נספרים, והציון מנורמל לפי מה שקיים. הציון מתאר סימנים שבעבר הקדימו עליית מחירים, <b>הוא לא תחזית ולא המלצת השקעה.</b>
                </p>
            </section>

            {meta?.status && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h2 className="mb-2 text-lg font-black">סטטוס עדכון לפי עיר</h2>
                    <ul className="grid gap-1 text-sm sm:grid-cols-2">
                        {CITIES.map((c) => {
                            const s = meta.status[c.code];
                            return (
                                <li key={c.code} className="flex justify-between gap-2">
                                    <span>{c.name}</span>
                                    <span className={s ? (s.ok ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-400'}>
                                        {s ? (s.ok ? `✓ ${s.areas} שכונות · ${when(s.at)}` : '✗ נכשל') : 'ממתין'}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}
        </main>
    );
}
