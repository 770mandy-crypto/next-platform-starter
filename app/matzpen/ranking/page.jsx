import Link from 'next/link';
import { formatPct, formatPrice } from 'components/matzpen/format';
import { ScoreBadge } from 'components/matzpen/score-badge';
import { loadDataset } from 'lib/nadlan/dataset';
import { trendLabel } from 'lib/nadlan/score';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'דירוג השכונות' };

export default async function RankingPage({ searchParams }) {
    const { city, sort = 'score' } = await searchParams;
    const data = await loadDataset();
    let areas = city ? data.areas.filter((a) => a.city === city) : data.areas;
    if (sort === 'yield') areas = [...areas].sort((a, b) => (b.rentYield ?? -1) - (a.rentYield ?? -1));
    if (sort === 'change') areas = [...areas].sort((a, b) => (b.change12m ?? -99) - (a.change12m ?? -99));
    if (sort === 'price') areas = [...areas].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    const current = data.cities.find((c) => c.id === city);
    const cities = [...data.cities].sort((a, b) => b.avgScore - a.avgScore);
    const q = (params) => `/matzpen/ranking?${new URLSearchParams({ ...(city ? { city } : {}), sort, ...params })}`;

    return (
        <main className="mx-auto max-w-5xl space-y-6 p-4">
            <h1 className="text-2xl font-black">{current ? `השכונות של ${current.name}` : 'דירוג השכונות בכל הארץ'}</h1>

            <section>
                <h2 className="mb-2 text-sm font-bold text-slate-500">ערים לפי ציון ממוצע</h2>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <Link href="/matzpen/ranking" className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-bold no-underline ${!city ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-800'}`}>
                        כל הארץ
                    </Link>
                    {cities.map((c) => (
                        <Link
                            key={c.id}
                            href={`/matzpen/ranking?city=${c.id}`}
                            className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold no-underline ${
                                city === c.id ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-800'
                            }`}
                        >
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: trendLabel(c.avgScore).color }} />
                            {c.name} <span className="font-normal opacity-70">{c.avgScore}</span>
                        </Link>
                    ))}
                </div>
            </section>

            <div className="flex flex-wrap gap-2 text-sm">
                <span className="py-1 text-slate-500">מיון:</span>
                {[
                    ['score', 'ציון'],
                    ['change', 'עלייה בשנה'],
                    ['yield', 'תשואה'],
                    ['price', 'הכי זול']
                ].map(([id, label]) => (
                    <Link key={id} href={q({ sort: id })} className={`rounded-full px-3 py-1 font-bold no-underline ${sort === id ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>
                        {label}
                    </Link>
                ))}
            </div>

            <ol className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {areas.map((a, i) => (
                    <li key={a.id}>
                        <Link href={`/matzpen/area/${a.id}`} className="flex items-center gap-3 px-4 py-3 text-slate-900 no-underline hover:bg-slate-50">
                            <span className="w-7 text-xs text-slate-400">{i + 1}</span>
                            <ScoreBadge area={a} />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-bold">{a.name}</span>
                                <span className="block truncate text-xs text-slate-500">{a.cityName}</span>
                            </span>
                            <span className="hidden w-28 text-left text-sm sm:block">{formatPrice(a.price)}</span>
                            <span dir="ltr" className={`w-16 text-left text-sm font-bold ${(a.change12m ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {formatPct(a.change12m)}
                            </span>
                            <span className="hidden w-14 text-left text-sm text-slate-600 sm:block">{Number.isFinite(a.rentYield) ? `${a.rentYield}%` : '—'}</span>
                        </Link>
                    </li>
                ))}
            </ol>
            <p className="text-xs text-slate-500">מחיר: חציון לדירה שלמה. שינוי: 12 החודשים האחרונים. תשואה: שכירות שנתית חלקי מחיר.</p>
        </main>
    );
}
