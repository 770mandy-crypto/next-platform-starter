import { NextResponse } from 'next/server';
import { publicMeeting, startMeeting } from 'lib/meet/engine';
import { publicUrl } from 'lib/meet/http';
import { isRecallConfigured } from 'lib/meet/recall';
import { listMeetings } from 'lib/meet/store';
import { HttpError, readJson, requireUser, route } from 'lib/pilot/http';

export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
    const user = await requireUser(request);
    const meetings = await listMeetings(user.id);
    return NextResponse.json({ meetings: meetings.map(publicMeeting) }, { headers: { 'cache-control': 'no-store' } });
});

// Sends a bot to a meeting. It joins as a visible participant and announces
// itself in the chat.
export const POST = route(async (request) => {
    const user = await requireUser(request);
    const body = await readJson(request);
    if (!isRecallConfigured()) {
        throw new HttpError('הבוט עדיין לא מחובר: חסר מפתח RECALL_API_KEY בהגדרות האתר.', 503);
    }
    const meeting = await startMeeting({
        user,
        meetingUrl: body?.meetingUrl,
        botName: body?.botName,
        language: body?.language,
        publicUrl: publicUrl(request)
    });
    return NextResponse.json({ meeting: publicMeeting(meeting) }, { status: 201 });
});
