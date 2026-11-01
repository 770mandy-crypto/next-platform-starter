import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContactOwner, DeleteListing } from 'components/matzpen/listing-actions';
import { formatIls, formatPrice } from 'components/matzpen/format';
import { ScoreBadge } from 'components/matzpen/score-badge';
import { Stat } from 'components/matzpen/stat';
import { getArea } from 'lib/nadlan/dataset';
import { getListing, publicListing } from 'lib/nadlan/listings';
import { getDb } from 'lib/pilot/db';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
    const listing = await getListing(await getDb(), (await params).id).catch(() => null);
    return { title: listing ? `${listing.rooms} חד׳ ב${listing.areaName}, ${listing.cityName}` : 'דירה למכירה' };
}

export default async function ListingPage({ params, searchParams }) {
    const { id } = await params;
    const { token } = await searchParams;
    const full = await getListing(await getDb(), id).catch(() => null);
    if (!full) notFound();
    const isOwner = typeof token === 'string' && token === full.editToken;
    const listing = publicListing(full);
    const area = await getArea(listing.areaId);
    const median = area?.perRoom?.[Math.round(listing.rooms)] ?? area?.price;
    const diff = Number.isFinite(median) ? Math.round(((listing.price - median) / median) * 100) : null;

    return (
        <main className="mx-auto max-w-3xl space-y-5 p-4">
            <nav className="text-sm text-slate-500">
                <Link href="/matzpen/listings">דירות למכירה</Link> › {listing.areaName}, {listing.cityName}
            </nav>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-3xl font-black">{formatPrice(listing.price)}</div>
                <div className="mt-1 text-slate-600">
                    {listing.rooms} חדרים · {listing.sqm} מ״ר{listing.floor != null ? ` · קומה ${listing.floor}` : ''}
                </div>
                <div className="mt-1 text-slate-500">
                    📍 {listing.street ? `${listing.street}, ` : ''}
                    {listing.areaName}, {listing.cityName}
                </div>
                {listing.description && <p className="mt-4 whitespace-pre-line leading-relaxed">{listing.description}</p>}
                <div className="mt-5">
                    <ContactOwner id={listing.id} name={listing.ownerName} />
                </div>
            </section>

            <section className="grid grid-cols-3 gap-2 text-center text-sm">
                <Stat label="מחיר למ״ר" value={formatIls(listing.pricePerSqm)} />
                <Stat label="חציון בשכונה" value={formatPrice(median)} />
                <Stat label="לעומת החציון" value={diff === null ? '—' : diff <= 0 ? `${Math.abs(diff)}% מתחת` : `${diff}% מעל`} />
            </section>

            {area && (
                <Link href={`/matzpen/area/${area.id}`} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 no-underline hover:border-indigo-400">
                    <ScoreBadge area={area} size="lg" />
                    <div className="flex-1">
                        <div className="font-black">שכונת {area.name}</div>
                        <div className="text-sm font-bold" style={{ color: area.trend.color }}>
                            {area.trend.label}
                        </div>
                    </div>
                    <span className="text-sm font-bold text-indigo-700">לעמוד השכונה ←</span>
                </Link>
            )}

            <p className="text-xs text-slate-500">
                המודעה פורסמה על ידי בעל הדירה. מצפן נדל״ן לא בודק מודעות ואינו צד לעסקה. לפני קנייה בדקו נסח טאבו, היתרים ומצב תכנוני, והתייעצו עם עורך דין ושמאי. השוואה לחציון
                היא לדירות עם מספר חדרים דומה בשכונה.
            </p>

            {isOwner && <DeleteListing id={listing.id} token={token} />}
        </main>
    );
}
