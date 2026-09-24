// Relative time in Hebrew, used by both server-rendered pages and the client.
export function timeAgo(ts, now = Date.now()) {
    const minutes = Math.round((now - ts) / 60000);
    if (minutes < 1) return 'עכשיו';
    if (minutes < 60) return `לפני ${minutes} דק׳`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return hours === 1 ? 'לפני שעה' : `לפני ${hours} שעות`;
    const days = Math.round(hours / 24);
    if (days === 1) return 'אתמול';
    if (days < 30) return `לפני ${days} ימים`;
    return new Date(ts).toLocaleDateString('he-IL');
}
