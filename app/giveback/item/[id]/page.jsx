import { notFound } from 'next/navigation';
import { currentUser } from 'lib/giveback/auth';
import { categoryById, conditionById } from 'lib/giveback/catalog';
import { googleEmbedUrl } from 'lib/giveback/geo';
import { getItem, publicItem } from 'lib/giveback/items';
import { timeAgo } from 'lib/giveback/format';
import { ItemActions } from 'components/giveback/item-actions';
import { StatusBadge } from 'components/giveback/item-card';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
    const { id } = await params;
    const item = await getItem(id);
    return item ? { title: `${item.title} · ${item.area}`, description: item.description } : { title: 'לא נמצא' };
}

export default async function ItemPage({ params, searchParams }) {
    const { id } = await params;
    const { new: justPosted } = await searchParams;
    const stored = await getItem(id);
    if (!stored) notFound();
    const item = publicItem(stored, { viewer: await currentUser() });
    const category = categoryById(item.category);
    const map = googleEmbedUrl(item.approx);

    return (
        <div className="flex flex-col gap-6">
            {justPosted && item.isOwner && (
                <p className="p-4 rounded-lg bg-green-500/15 text-green-100">
                    🎉 פורסם! שכנים בסביבה יכולים למצוא את זה עכשיו. תקבלו הודעה בלשונית ״הודעות״.
                </p>
            )}
            <div className="grid gap-8 md:grid-cols-2">
                <div className="flex flex-col gap-3">
                    {item.photos.length > 0 ? (
                        item.photos.map((src, i) => (
                            <img key={src} src={src} alt={`${item.title} ${i + 1}`} className="w-full rounded-xl" />
                        ))
                    ) : (
                        <div className="flex items-center justify-center rounded-xl aspect-[4/3] bg-white/5 text-8xl">
                            {category.emoji}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={item.status} />
                        <span className="text-sm opacity-70">
                            {category.emoji} {category.label} · {conditionById(item.condition)?.label}
                        </span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl">{item.title}</h1>
                    <p className="opacity-80">
                        📍 {item.area} · מוסר/ת: {item.ownerName} · {timeAgo(item.createdAt)}
                    </p>
                    {item.description && <p className="whitespace-pre-wrap">{item.description}</p>}

                    <ItemActions item={item} />

                    {map && (
                        <div className="flex flex-col gap-2">
                            <iframe
                                title="אזור האיסוף"
                                src={map}
                                className="w-full h-56 border-0 rounded-xl"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                            <p className="text-xs opacity-60">המפה מראה את האזור בלבד, לא את הכתובת המדויקת.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
