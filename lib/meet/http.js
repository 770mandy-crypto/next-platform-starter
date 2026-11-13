// Small helpers shared by the meet API routes.

import { timingSafeEqual } from 'node:crypto';
import { HttpError } from '../pilot/http.js';
import { getMeeting } from './store.js';

// Where Recall can reach this site. On Netlify, URL is the site's main
// address; MEET_PUBLIC_URL overrides it (a tunnel in development, say).
export function publicUrl(request) {
    const configured = process.env.MEET_PUBLIC_URL || process.env.URL;
    return (configured || new URL(request.url).origin).replace(/\/$/, '');
}

export async function ownedMeeting(user, id) {
    const meeting = await getMeeting(id);
    // Someone else's meeting looks the same as one that does not exist.
    if (!meeting || meeting.userId !== user.id) throw new HttpError('הפגישה לא נמצאה.', 404);
    return meeting;
}

export function safeEqual(a, b) {
    const left = Buffer.from(String(a));
    const right = Buffer.from(String(b));
    return left.length === right.length && timingSafeEqual(left, right);
}
