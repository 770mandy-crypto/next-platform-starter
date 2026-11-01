import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Stat } from 'components/matzpen/stat';
import { formatMonth, formatPct, formatPrice, PART_LABELS, SIGNAL_ICONS } from 'components/matzpen/format';
import { ListingCard } from 'components/matzpen/listing-card';
import { PriceChart } from 'components/matzpen/price-chart';
import { ScoreBadge } from 'components/matzpen/score-badge';
import { getDb } from 'lib/pilot/db';
import { getArea, loadDataset } from 'lib/nadlan/dataset';
import { searchListings } from 'lib/nadlan/listings';
import { WEIGHTS } from 'lib/nadlan/score';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
    const area = await getArea((await params).id);
    return { title: area ? `${area.name}, ${area.cityName}` : 'שכונה' };
}

const MAX = { momentum: WEIGHTS.momentum, longTerm: WEIGHTS.longTerm, gap: WEIGHTS.gap, yield: WEIGHTS.yield, signals: WEIGHTS.signals };

export default async function AreaPage({ params }) {
    const { id } = await params;
    const area = await getArea(id);
    if (!area) notFound();
    const data = await loadDataset();
    const inCity = data.areas.filter((a) => a.city === area.city);
    const rank = inCity.findIndex((a) => a.id === area.id) + 1;
    const listings = await searchListings(await getDb(), { areaId: area.id }).catch(() => []);
    const question = `ספר לי על שכונת ${area.name} ב${area.cityName}: האם כדאי לקנות שם, ומה הסיכונים?`;

    return (
        <main className="mx-auto max-w-4xl space-y-5 p-4">
            <nav className="text-sm text-slate-500">
                <Link href="/matzpen/ranking">דירוג</Link> ›{' '}
                <Link href={`/matzpen/ranking?city=${area.city}`}>{area.cityName}</Link> › {area.name}
            </nav>

            <section className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                <ScoreBadge area={area} size="xl" />
                <div className="flex-1">
                    <h1 className="text-3xl font-black">{area.name}</h1>
                    <div className="text-slate-600">{area.cityName}</div>
                    <div className="font-bold" style={{ color: area.trend.color }}>
                        {area.trend.label} · מקום {rank} מתוך {inCity.length} ב{area.cityName}
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
                <Stat label="מחיר חציוני" value={formatPrice(area.price)} />
                <Stat label="שינוי בשנה" value={formatPct(area.change12m)} />
                <Stat label="שינוי ב-3 שנים" value={formatPct(area.change36m)} />
                <Stat label="תשואה משכירות" value={Number.isFinite(area.rentYield) ? `${area.rentYield}%` : '—'} />
            </section>

            <div className="grid gap-5 md:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h2 className="mb-3 text-lg font-black">מחיר חציוני לאורך זמן</h2>
                    <PriceChart history={area.history} color={area.trend.color} />
                    {area.perRoom && Object.keys(area.perRoom).length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2 text-sm">
                            {Object.entries(area.perRoom).map(([rooms, price]) => (
                                <span key={rooms} className="rounded-full bg-slate-100 px-3 py-1">
                                    {rooms} חד׳: <b>{formatPrice(price)}</b>
                                </span>
                            ))}
                        </div>
                    )}
                    <p className="mt-3 text-xs text-slate-500">
                        {area.source === 'sample' ? 'נתוני דוגמה.' : `מקור: עסקאות רשות המסים (nadlan.gov.il), נכון ל-${formatMonth(area.asOf)}.`}
                        {Number.isFinite(area.gapPercent) && ` ${area.gapPercent >= 0 ? 'זולה' : 'יקרה'} ב-${Math.abs(area.gapPercent)}% מהחציון בעיר.`}
                    </p>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h2 className="mb-3 text-lg font-black">איך חושב הציון</h2>
                    <ul className="space-y-2 text-sm">
                        {Object.entries(MAX).map(([key, max]) => (
                            <li key={key}>
                                <div className="mb-0.5 flex justify-between">
                                    <span>{PART_LABELS[key]}</span>
                                    <span className="text-slate-500">{key in area.parts ? `${area.parts[key]} מתוך ${max}` : 'אין נתונים'}</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                    {key in area.parts && <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(area.parts[key] / max) * 100}%` }} />}
                                </div>
                            </li>
                        ))}
                        {area.parts.risks < 0 && (
                            <li className="flex justify-between text-rose-700">
                                <span>סיכונים</span>
                                <span dir="ltr">{area.parts.risks}</span>
                            </li>
                        )}
                    </ul>
                    <p className="mt-3 text-xs text-slate-500">חלקים בלי נתונים לא נספרים, והציון מנורמל לפי מה שקיים (כיסוי: {area.coverage}%).</p>
                </section>
            </div>

            <section className="grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h2 className="mb-2 text-lg font-black">מנועי צמיחה</h2>
                    {area.signals.length ? (
                        <ul className="space-y-1 text-sm">
                            {area.signals.map((s) => (
                                <li key={s.text}>
                                    {SIGNAL_ICONS[s.kind] ?? '✓'} {s.source ? <a href={s.source}>{s.text}</a> : s.text}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-slate-500">עוד לא נאספו לשכונה הזו. אפשר לשאול את הסוכן, והוא יבדוק חדשות תכנון ותחבורה עדכניות.</p>
                    )}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h2 className="mb-2 text-lg font-black">סיכונים</h2>
                    {area.risks.length ? (
                        <ul className="space-y-1 text-sm text-rose-700">
                            {area.risks.map((r) => (
                                <li key={r}>⚠️ {r}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-slate-500">לא זוהו סיכונים בנתונים. זה לא אומר שאין: בדקו כל דירה לגופה.</p>
                    )}
                </div>
            </section>

            <div className="flex flex-col gap-2 sm:flex-row">
                <Link href={`/matzpen/agent?q=${encodeURIComponent(question)}`} className="flex-1 rounded-xl bg-indigo-600 py-3 text-center font-bold text-white no-underline hover:bg-indigo-700">
                    💬 שאלו את הסוכן על השכונה
                </Link>
                <Link href={`/matzpen/publish?area=${area.id}`} className="flex-1 rounded-xl border border-slate-300 bg-white py-3 text-center font-bold text-slate-800 no-underline hover:border-slate-500">
                    ➕ יש לכם דירה כאן? פרסמו אותה
                </Link>
            </div>

            <section>
                <h2 className="mb-3 text-xl font-black">דירות למכירה ב{area.name}</h2>
                {listings.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {listings.map((l) => (
                            <ListingCard key={l.id} listing={l} median={area.perRoom?.[Math.round(l.rooms)] ?? area.price} />
                        ))}
                    </div>
                ) : (
                    <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">עוד אין דירות למכירה בשכונה הזו.</p>
                )}
            </section>

            <p className="text-xs text-slate-500">המידע אינו מהווה ייעוץ השקעות. לפני קנייה בדקו את הדירה, את מצבה המשפטי והתכנוני, והתייעצו עם שמאי, עורך דין ויועץ משכנתאות.</p>
        </main>
    );
}
