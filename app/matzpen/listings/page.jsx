import Link from 'next/link';
import { ListingCard } from 'components/matzpen/listing-card';
import { loadDataset } from 'lib/nadlan/dataset';
import { searchListings } from 'lib/nadlan/listings';
import { getDb } from 'lib/pilot/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'דירות למכירה' };

export default async function ListingsPage({ searchParams }) {
    const { city = '', area = '', max = '', rooms = '' } = await searchParams;
    const data = await loadDataset();
    const selectedArea = data.areas.find((a) => a.id === area);
    const listings = await searchListings(await getDb(), {
        areaId: area || undefined,
        city: (!area && city) || undefined,
        maxPrice: Number(max) || undefined,
        minRooms: Number(rooms) || undefined,
        limit: 100
    }).catch(() => []);
    const byId = Object.fromEntries(data.areas.map((a) => [a.id, a]));
    const field = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm';

    return (
        <main className="mx-auto max-w-5xl space-y-5 p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <h1 className="text-2xl font-black">{selectedArea ? `דירות למכירה ב${selectedArea.name}, ${selectedArea.cityName}` : 'דירות למכירה מבעלי דירות'}</h1>
                <Link href="/matzpen/publish" className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white no-underline">
                    ➕ פרסום דירה
                </Link>
            </div>

            <form className="flex flex-wrap gap-2" action="/matzpen/listings">
                <select name="city" defaultValue={selectedArea?.city ?? city} className={field}>
                    <option value="">כל הערים</option>
                    {data.cities.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
                <input name="max" type="number" step="50000" defaultValue={max} placeholder="מחיר מקסימלי" className={`${field} w-36`} />
                <select name="rooms" defaultValue={rooms} className={field}>
                    <option value="">כל מספר חדרים</option>
                    {[2, 3, 4, 5].map((r) => (
                        <option key={r} value={r}>
                            {r}+ חדרים
                        </option>
                    ))}
                </select>
                <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">סינון</button>
            </form>

            {listings.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {listings.map((l) => {
                        const a = byId[l.areaId];
                        return <ListingCard key={l.id} listing={l} median={a?.perRoom?.[Math.round(l.rooms)] ?? a?.price} />;
                    })}
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
                    <p className="mb-3">עוד אין דירות שמתאימות לחיפוש.</p>
                    <Link href="/matzpen/publish" className="font-bold">
                        יש לכם דירה למכירה? פרסמו אותה בחינם
                    </Link>
                </div>
            )}
        </main>
    );
}
