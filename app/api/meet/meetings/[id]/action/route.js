import { NextResponse } from 'next/server';
import { isBrainConfigured } from 'lib/meet/brain';
import { deliver, endMeeting, LIVE_STATUSES, publicMeeting, respond, runDeck, runSummary } from 'lib/meet/engine';
import { ownedMeeting } from 'lib/meet/http';
import { addLine } from 'lib/meet/store';
import { clip, HttpError, readJson, requireUser, route } from 'lib/pilot/http';
import { consumeAiQuota } from 'lib/pilot/workspace';

export const dynamic = 'force-dynamic';

// What the meeting's owner can make the bot do from the page:
//   say      speak (and write) the given text in the meeting
//   ask      put a question to the bot as if it were asked in the meeting
//   summary  summarize now; with announce, also share it in the meeting
//   deck     build a presentation; with announce, share its link in the meeting
//   leave    take the bot out of the meeting
export const POST = route(async (request, { params }) => {
    const user = await requireUser(request);
    const { id } = await params;
    const meeting = await ownedMeeting(user, id);
    const body = await readJson(request);
    const text = clip(body?.text, 2000);
    const announce = body?.announce === true;
    const inCall = meeting.status === 'in_call' || meeting.status === 'live';
    const needBrain = () => {
        if (!isBrainConfigured()) throw new HttpError('חסר מפתח ANTHROPIC_API_KEY בהגדרות האתר.', 503);
    };
    const needCall = () => {
        if (!inCall) throw new HttpError('הבוט לא נמצא כרגע בתוך הפגישה.', 409);
    };

    switch (body?.type) {
        case 'say': {
            if (!text) throw new HttpError('אין טקסט לומר.', 400);
            needCall();
            return NextResponse.json({ result: await deliver(meeting, { say: text }) });
        }
        case 'ask': {
            if (!text) throw new HttpError('השאלה ריקה.', 400);
            needBrain();
            needCall();
            await addLine(meeting.id, { kind: 'chat', speaker: user.name, text });
            const result = await respond(meeting, { request: text, speaker: user.name, viaChat: true });
            if (result.skipped === 'busy') throw new HttpError('הבוט באמצע תשובה אחרת. נסו שוב בעוד רגע.', 429);
            return NextResponse.json({ result });
        }
        case 'summary': {
            needBrain();
            await consumeAiQuota(user.id);
            return NextResponse.json({ summary: await runSummary(meeting, { announce }) });
        }
        case 'deck': {
            needBrain();
            await consumeAiQuota(user.id);
            return NextResponse.json({ deck: await runDeck(meeting, text, { announce }) });
        }
        case 'leave': {
            if (!LIVE_STATUSES.includes(meeting.status)) throw new HttpError('הבוט כבר לא בפגישה.', 409);
            return NextResponse.json({ meeting: publicMeeting(await endMeeting(meeting)) });
        }
        default:
            throw new HttpError('פעולה לא מוכרת.', 400);
    }
});
