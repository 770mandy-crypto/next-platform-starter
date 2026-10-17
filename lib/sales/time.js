// Time-zone arithmetic without a date library: everything is computed through
// Intl, so it follows each zone's real daylight-saving rules.

const partsCache = new Map();

function formatter(timeZone) {
    if (!partsCache.has(timeZone)) {
        partsCache.set(
            timeZone,
            new Intl.DateTimeFormat('en-US', {
                timeZone,
                hourCycle: 'h23',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                weekday: 'short'
            })
        );
    }
    return partsCache.get(timeZone);
}

const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// The wall-clock reading of an instant in a zone.
export function localParts(date, timeZone) {
    const parts = Object.fromEntries(formatter(timeZone).formatToParts(date).map((p) => [p.type, p.value]));
    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
        hour: Number(parts.hour),
        minute: Number(parts.minute),
        second: Number(parts.second),
        weekday: WEEKDAYS[parts.weekday],
        hhmm: `${parts.hour}:${parts.minute}`,
        date: `${parts.year}-${parts.month}-${parts.day}`
    };
}

function offsetMs(date, timeZone) {
    const p = localParts(date, timeZone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// The instant at which the wall clock in a zone reads dateStr ("YYYY-MM-DD") hh:mm.
export function zonedToUtc(dateStr, hhmm, timeZone) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = hhmm.split(':').map(Number);
    const guess = Date.UTC(y, m - 1, d, hh, mm);
    let result = guess - offsetMs(new Date(guess), timeZone);
    // A second pass settles instants near a DST switch.
    result = guess - offsetMs(new Date(result), timeZone);
    return new Date(result);
}

export function addDays(dateStr, days) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function formatLocal(date, timeZone, locale = 'he-IL') {
    return new Intl.DateTimeFormat(locale, {
        timeZone,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).format(date);
}
