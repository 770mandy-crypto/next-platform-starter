import { NextResponse } from 'next/server';
import { publicMeeting, refreshStatus } from 'lib/meet/engine';
import { ownedMeeting } from 'lib/meet/http';
import { getDeck, getDoc, getLines } from 'lib/meet/store';
import { requireUser, route } from 'lib/pilot/http';

export const dynamic = 'force-dynamic';

// One meeting with its transcript. The page polls this while a meeting is
// live; `after` (the key of the last line it has) returns only newer lines.
// Each poll also asks Recall for the bot's status, so the page is right even
// when the status webhook is not set up.
export const GET = route(async (request, { params }) => {
    const user = await requireUser(request);
    const { id } = await params;
    let meeting = await ownedMeeting(user, id);
    try {
        meeting = await refreshStatus(meeting);
    } catch (error) {
        console.error('Meet status refresh failed:', error);
    }
    const after = new URL(request.url).searchParams.get('after');
    const lines = await getLines(meeting.id, { after: after && /^[\w-]{1,40}$/.test(after) ? after : null, limit: 500 });
    const decks = (await Promise.all((meeting.deckIds ?? []).map((deckId) => getDeck(deckId))))
        .filter(Boolean)
        .map((deck) => ({ id: deck.id, title: deck.title, slides: deck.slides.length, createdAt: deck.createdAt }));
    const docs = (await Promise.all((meeting.docIds ?? []).map((docId) => getDoc(docId))))
        .filter(Boolean)
        .map((doc) => ({ id: doc.id, title: doc.title, createdAt: doc.createdAt }));
    return NextResponse.json(
        { meeting: publicMeeting(meeting), lines, decks, docs },
        { headers: { 'cache-control': 'no-store' } }
    );
});
