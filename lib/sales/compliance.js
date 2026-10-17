// Contact rules for outbound calls. Every outbound call — dispatcher or a
// manual "call this lead" click — goes through checkOutboundAllowed, and a
// single failed rule blocks the call.

import { localParts } from './time.js';

export const BLOCKED_STATUSES = new Set(['do_not_call', 'not_interested', 'meeting_booked', 'won', 'lost', 'handed_off']);

// Returns null when the call may go ahead, or the reason it may not.
export function checkOutboundAllowed({ business, lead, onDoNotCallList, callsLastHour, now = new Date() }) {
    if (!business.outbound_enabled) return 'outbound_disabled';
    if (onDoNotCallList) return 'do_not_call';
    if (!lead.consent_call) return 'no_consent';
    if (BLOCKED_STATUSES.has(lead.status)) return 'status_blocked';
    if (lead.attempts >= business.max_attempts_per_lead) return 'max_attempts';
    if (lead.next_call_at && new Date(lead.next_call_at) > now) return 'not_due';
    if (!withinCallingWindow(business.calling_window, lead.timezone || business.timezone, now)) {
        return 'outside_window';
    }
    if (callsLastHour >= business.max_calls_per_hour) return 'rate_limited';
    return null;
}

// The window is in the LEAD's local time (falls back to the business zone).
export function withinCallingWindow(window, timeZone, now = new Date()) {
    if (!window?.days?.length) return false;
    const local = localParts(now, timeZone);
    return window.days.includes(local.weekday) && local.hhmm >= window.start && local.hhmm < window.end;
}

// Phrases that mean "stop calling me". The model also has a tool for this;
// this check is the backstop that works even if the model misses it.
const STOP_PATTERNS = [
    /אל\s*ת(תקשרו|תקשר|חייגו|חייג)/,
    /תורידו\s*אותי/,
    /תסיר(ו)?\s*אותי/,
    /להסיר\s*אותי/,
    /לא\s*להתקשר\s*(אליי|אלי)/,
    /אל\s*תחזרו\s*אליי/,
    /\bdo\s*n[o']?t\s*call\b/i,
    /\bstop\s*calling\b/i,
    /\bremove\s*me\b/i,
    /\btake\s*me\s*off\b/i,
    /\bunsubscribe\b/i
];

export function isStopRequest(text) {
    return STOP_PATTERNS.some((pattern) => pattern.test(String(text ?? '')));
}
