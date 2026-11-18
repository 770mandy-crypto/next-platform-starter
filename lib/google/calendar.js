// Calendar events through the Google Calendar API. Creating an event is only
// ever called from the approval path, after the person has confirmed it.

const calendarHost = () => (process.env.GOOGLE_CALENDAR_HOST || 'https://www.googleapis.com').replace(/\/$/, '');
const TIMEOUT_MS = 20_000;
export const MAX_EVENT_MINUTES = 8 * 60;
export const TIME_ZONE = 'Asia/Jerusalem';

export class CalendarError extends Error {
    constructor(message, status = 502) {
        super(message);
        this.status = status;
    }
}

async function api(path, { token, method = 'GET', body, fetchImpl = fetch }) {
    const response = await fetchImpl(`${calendarHost()}${path}`, {
        method,
        headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!response.ok) throw new CalendarError('היומן לא ענה כמצופה. נסו שוב.', response.status === 401 ? 409 : 502);
    return response.json();
}

// Checks the times before anything is created: both must be real, the end
// after the start, and no event longer than a working day.
export function checkWindow(start, end, now = Date.now()) {
    const from = new Date(start);
    const to = new Date(end);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new CalendarError('התאריך אינו תקין.', 400);
    if (to <= from) throw new CalendarError('סוף האירוע חייב להיות אחרי ההתחלה.', 400);
    if ((to - from) / 60_000 > MAX_EVENT_MINUTES) throw new CalendarError('האירוע ארוך מדי.', 400);
    if (from.getTime() < now - 60_000) throw new CalendarError('אי אפשר לקבוע אירוע בעבר.', 400);
    return { from, to };
}

export async function listEvents({ token, from, to, fetchImpl = fetch }) {
    const params = new URLSearchParams({
        timeMin: new Date(from).toISOString(),
        timeMax: new Date(to).toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '50'
    });
    const data = await api(`/calendar/v3/calendars/primary/events?${params}`, { token, fetchImpl });
    return (data.items ?? []).map((event) => ({
        id: event.id,
        title: event.summary ?? '(בלי כותרת)',
        start: event.start?.dateTime ?? event.start?.date ?? null,
        end: event.end?.dateTime ?? event.end?.date ?? null
    }));
}

export async function createEvent({ token, title, start, end, description = '', now, fetchImpl = fetch }) {
    const { from, to } = checkWindow(start, end, now);
    const event = await api('/calendar/v3/calendars/primary/events', {
        token,
        method: 'POST',
        body: {
            summary: String(title || 'פגישה').replace(/[\r\n]+/g, ' ').slice(0, 200),
            description: String(description).slice(0, 2000),
            start: { dateTime: from.toISOString(), timeZone: TIME_ZONE },
            end: { dateTime: to.toISOString(), timeZone: TIME_ZONE }
        },
        fetchImpl
    });
    return event.id;
}
