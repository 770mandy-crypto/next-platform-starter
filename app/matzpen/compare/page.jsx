import Link from 'next/link';
import { ComparePicker } from 'components/matzpen/compare-picker';
import { formatPct, formatPrice } from 'components/matzpen/format';
import { MultiChart } from 'components/matzpen/multi-chart';
import { ScoreBadge } from 'components/matzpen/score-badge';
import { loadDataset } from 'lib/nadlan/dataset';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'השוואת שכונות' };

const COLORS = ['#4f46e5', '#059669', '#d97706'];
const pct = (v) => (Number.isFinite(v) ? `${v}%` : '—');

// Each row: label, value for an area, and which way is better (to mark the best).
const ROWS = [
    ['ציון צמיחה', (a) => a.score, (a) => a.score, 'high'],
    ['מחיר חציוני', (a) => formatPrice(a.price), (a) => a.price, 'low'],
    ['שינוי בשנה', (a) => formatPct(a.change12m), (a) => a.change12m, 'high'],
    ['שינוי ב-3 שנים', (a) => formatPct(a.change36m), (a) => a.change36m, 'high'],
    ['תשואה משכירות', (a) => pct(a.rentYield), (a) => a.rentYield, 'high'],
    ['לעומת החציון בעיר', (a) => (Number.isFinite(a.gapPercent) ? (a.gapPercent >= 0 ? `זולה ב-${a.gapPercent}%` : `יקרה ב-${-a.gapPercent}%`) : '—'), (a) => a.gapPercent, 'high'],
    ['סיכונים', (a) => a.risks.length || 'לא זוהו', (a) => a.risks.length, 'low']
];

function bestIndex(areas, get, dir) {
    const vals = areas.map(get);
    const known = vals.filter(Number.isFinite);
    if (known.length < 2) return -1;
    const best = dir === 'high' ? Math.max(...known) : Math.min(...known);
    return vals.filter((v) => v === best).length === 1 ? vals.indexOf(best) : -1;
}

export default async function ComparePage({ searchParams }) {
    const { ids = '' } = await searchParams;
    const data = await loadDataset();
    const byId = Object.fromEntries(data.areas.map((a) => [a.id, a]));
    const wanted = String(ids).split(',').filter((id) => byId[id]).slice(0, 3);
    const chosen = wanted.map((id, i) => ({ ...byId[id], color: COLORS[i] }));
    const picker = data.areas.map(({ id, name, city, score }) => ({ id, name, city, score }));

    return (
        <main className="mx-auto max-w-5xl space-y-5 p-4">
            <h1 className="text-2xl font-black">השוואת שכונות</h1>
            <ComparePicker areas={picker} cities={data.cities.map(({ id, name }) => ({ id, name }))} ids={wanted} colors={COLORS} />

            {chosen.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">בחרו עד 3 שכונות כדי להשוות ביניהן.</p>
            ) : (
                <>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                        <table className="w-full min-w-[480px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="p-3" />
                                    {chosen.map((a) => (
                                        <th key={a.id} className="p-3 text-right">
                                            <Link href={`/matzpen/area/${a.id}`} className="flex items-center gap-2 text-slate-900 no-underline">
                                                <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: a.color }} />
                                                <ScoreBadge area={a} />
                                                <span>
                                                    <span className="block font-black">{a.name}</span>
                                                    <span className="block text-xs font-normal text-slate-500">{a.cityName}</span>
                                                </span>
                                            </Link>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {ROWS.map(([label, show, get, dir]) => {
                                    const best = bestIndex(chosen, get, dir);
                                    return (
                                        <tr key={label}>
                                            <th className="p-3 text-right font-bold text-slate-600">{label}</th>
                                            {chosen.map((a, i) => (
                                                <td key={a.id} className={`p-3 ${i === best ? 'font-black text-emerald-700' : ''}`}>
                                                    {show(a)}
                                                    {i === best && ' ✓'}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                                <tr>
                                    <th className="p-3 text-right font-bold text-slate-600">מגמה</th>
                                    {chosen.map((a) => (
                                        <td key={a.id} className="p-3 font-bold" style={{ color: a.trend.color }}>
                                            {a.trend.label}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h2 className="mb-3 text-lg font-black">מחיר חציוני לאורך זמן</h2>
                        <MultiChart series={chosen.map(({ id, history, color }) => ({ id, history, color }))} />
                    </section>
                </>
            )}
        </main>
    );
}
