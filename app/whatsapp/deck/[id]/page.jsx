import { notFound } from 'next/navigation';
import { getDeck } from 'lib/whatsapp/store';
import { DeckView } from '../../../meet/deck/[id]/deck-view';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
    const deck = await getDeck((await params).id);
    return { title: deck?.title ?? 'מצגת', robots: { index: false } };
}

// A presentation the WhatsApp assistant built. The link is sent in the chat
// and opens without signing in; the id is long and random.
export default async function WhatsAppDeckPage({ params }) {
    const deck = await getDeck((await params).id);
    if (!deck) notFound();
    return <DeckView rtl={['he', 'ar'].includes(deck.language)} title={deck.title} subtitle={deck.subtitle} slides={deck.slides} />;
}
