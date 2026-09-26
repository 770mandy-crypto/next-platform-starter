// How an approved external action actually reaches the world in the MVP.
// Nothing is sent from the server on the user's behalf: each action becomes a
// hand-off the user completes with one click (their own mail client, their own
// calendar, their own social account). Real integrations replace these later.

function pad(value) {
    return String(value).padStart(2, '0');
}

function toIcsDate(date) {
    return (
        `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
        `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
    );
}

// RFC 5545 text escaping: backslash first, then the separators.
function escapeIcs(text = '') {
    return String(text).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function buildIcs({ title, when, durationMinutes = 30, description = '' }, now = new Date()) {
    const start = new Date(when);
    const end = new Date(start.getTime() + Number(durationMinutes || 30) * 60_000);
    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Maslul AI//MVP//HE',
        'BEGIN:VEVENT',
        `UID:${start.getTime()}-${Math.random().toString(36).slice(2)}@maslul.ai`,
        `DTSTAMP:${toIcsDate(now)}`,
        `DTSTART:${toIcsDate(start)}`,
        `DTEND:${toIcsDate(end)}`,
        `SUMMARY:${escapeIcs(title)}`,
        `DESCRIPTION:${escapeIcs(description)}`,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
}

export function buildMailto({ to = '', subject = '', body = '' }) {
    const query = new URLSearchParams({ subject, body }).toString().replace(/\+/g, '%20');
    return `mailto:${encodeURIComponent(to).replace(/%40/g, '@')}?${query}`;
}

export function buildShareUrl({ platform = 'linkedin', text = '' }) {
    if (platform === 'x' || platform === 'twitter') {
        return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    }
    return `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
}
