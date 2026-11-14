// People say "tomorrow at 8" in Israel time, and the clocks there move twice a
// year. Claude writes local wall-clock times ("2026-03-29T08:00"); turning them
// into instants is done here, with the time-zone database, not by the model.

export const TIME_ZONE = 'Asia/Jerusalem';

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/;

function wallClock(instant, timeZone) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).formatToParts(new Date(instant));
    const get = (type) => Number(parts.find((p) => p.type === type).value);
    return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
}

// How far the zone's wall clock is ahead of UTC at that instant, in ms.
function offsetAt(instant, timeZone) {
    const w = wallClock(instant, timeZone);
    return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - Math.floor(instant / 1000) * 1000;
}

// "2026-03-29T08:00" in Israel → epoch ms. Returns null for anything that is
// not a real date and time. A time skipped by the spring change (02:30 on the
// night clocks jump) lands an hour later, as a phone alarm would.
export function localToInstant(local, timeZone = TIME_ZONE) {
    const m = LOCAL_RE.exec(String(local ?? '').trim());
    if (!m) return null;
    const [year, month, day, hour, minute] = m.slice(1).map(Number);
    if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
    const asUtc = Date.UTC(year, month - 1, day, hour, minute);
    if (new Date(asUtc).getUTCDate() !== day) return null; // 31 February and friends
    let instant = asUtc - offsetAt(asUtc, timeZone);
    instant = asUtc - offsetAt(instant, timeZone);
    return instant;
}

// Epoch ms → "2026-03-29T08:00" on the Israel clock.
export function instantToLocal(instant, timeZone = TIME_ZONE) {
    const w = wallClock(instant, timeZone);
    const pad = (n) => String(n).padStart(2, '0');
    return `${w.year}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}`;
}

// What Claude is told the time is: weekday included, since people say
// "on Sunday" far more than they give dates.
export function describeNow(now, timeZone = TIME_ZONE) {
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' }).format(new Date(now));
    return `${weekday} ${instantToLocal(now, timeZone).replace('T', ' ')}`;
}

// The next time a repeating reminder fires, on the wall clock: a daily 08:00
// reminder stays at 08:00 across the clock change. A monthly reminder on the
// 31st falls on the last day of shorter months, and is back on the 31st after
// them: anchorDay is the day of the month it was first set for.
export function nextOccurrence(dueAt, repeat, anchorDay = null, timeZone = TIME_ZONE) {
    const m = LOCAL_RE.exec(instantToLocal(dueAt, timeZone));
    let [year, month, day, hour, minute] = m.slice(1).map(Number);
    if (anchorDay && (repeat === 'monthly' || repeat === 'yearly')) day = anchorDay;
    if (repeat === 'daily') day += 1;
    else if (repeat === 'weekly') day += 7;
    else if (repeat === 'monthly' || repeat === 'yearly') {
        if (repeat === 'monthly') month += 1;
        else year += 1;
        if (month > 12) {
            month -= 12;
            year += 1;
        }
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        day = Math.min(day, lastDay);
    } else return null;
    // Date.UTC normalises an overflowing day into the next month.
    const date = new Date(Date.UTC(year, month - 1, day));
    const pad = (n) => String(n).padStart(2, '0');
    const local = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(hour)}:${pad(minute)}`;
    return localToInstant(local, timeZone);
}
