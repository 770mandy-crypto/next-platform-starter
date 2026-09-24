import Link from 'next/link';
import { STATUSES, categoryById } from 'lib/giveback/catalog';
import { formatDistance } from 'lib/giveback/geo';

export function StatusBadge({ status }) {
    const s = STATUSES[status] ?? STATUSES.available;
    return <span className={`px-2 py-0.5 text-xs rounded-full ${s.className}`}>{s.label}</span>;
}

export function ItemCard({ item }) {
    const category = categoryById(item.category);
    return (
        <Link
            href={`/giveback/item/${item.id}`}
            className="flex flex-col overflow-hidden no-underline transition border rounded-xl border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50"
        >
            <div className="relative flex items-center justify-center aspect-[4/3] bg-black/30">
                {item.photos[0] ? (
                    <img src={item.photos[0]} alt={item.title} className="object-cover w-full h-full" loading="lazy" />
                ) : (
                    <span className="text-6xl" aria-hidden="true">
                        {category.emoji}
                    </span>
                )}
                {item.distanceKm != null && (
                    <span className="absolute px-2 py-1 text-xs font-bold rounded-full top-2 start-2 bg-primary text-primary-content">
                        📍 {formatDistance(item.distanceKm)}
                    </span>
                )}
            </div>
            <div className="flex flex-col gap-1 p-3">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base leading-snug">{item.title}</h3>
                    {item.status !== 'available' && <StatusBadge status={item.status} />}
                </div>
                <p className="text-sm opacity-70">
                    {category.emoji} {category.label} · {item.area}
                </p>
            </div>
        </Link>
    );
}
