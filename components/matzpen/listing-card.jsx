import Link from 'next/link';
import { formatIls, formatPrice } from './format';

// median: the neighborhood's median for a similar apartment, to compare with.
export function ListingCard({ listing, median }) {
    const diff = Number.isFinite(median) && median > 0 ? Math.round(((listing.price - median) / median) * 100) : null;
    return (
        <Link href={`/matzpen/listings/${listing.id}`} className="block rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 no-underline shadow-sm hover:border-indigo-400">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <div className="text-xl font-black">{formatPrice(listing.price)}</div>
                    <div className="text-sm text-slate-600">
                        {listing.rooms} חד׳ · {listing.sqm} מ״ר{listing.floor != null ? ` · קומה ${listing.floor}` : ''}
                    </div>
                </div>
                {diff !== null && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${diff <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {diff <= 0 ? `${Math.abs(diff)}% מתחת לחציון` : `${diff}% מעל החציון`}
                    </span>
                )}
            </div>
            <div className="mt-2 text-sm text-slate-500">
                📍 {listing.street ? `${listing.street}, ` : ''}
                {listing.areaName}, {listing.cityName}
            </div>
            <div className="mt-1 text-xs text-slate-400">{formatIls(listing.pricePerSqm)} למ״ר</div>
        </Link>
    );
}
