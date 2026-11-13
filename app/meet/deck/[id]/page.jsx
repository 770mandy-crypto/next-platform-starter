import { notFound } from 'next/navigation';
import { getDeck } from 'lib/meet/store';
import { DeckView } from './deck-view';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
    const deck = await getDeck((await params).id);
    return { title: deck?.title ?? 'מצגת', robots: { index: false } };
}

// A presentation the bot built. The link is what gets shared in the meeting
// chat, so it opens without signing in; the id is long and random.
export default async function DeckPage({ params }) {
    const deck = await getDeck((await params).id);
    if (!deck) notFound();
    const rtl = ['he', 'ar'].includes(deck.language);
    return (
        <DeckView
            rtl={rtl}
            title={deck.title}
            subtitle={deck.subtitle}
            slides={deck.slides.map(({ title, bullets, notes }) => ({ title, bullets, notes }))}
        />
    );
}
