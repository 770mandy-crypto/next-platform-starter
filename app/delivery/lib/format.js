// עיצוב חותמת זמן לתצוגה בעברית (תאריך + שעה)
export function formatDateTime(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleString('he-IL', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// משך זמן קריא בין שתי חותמות (למשל: כמה זמן לקח המשלוח)
export function formatDuration(from, to) {
    if (!from || !to || to < from) return '';
    const minutes = Math.round((to - from) / 60000);
    if (minutes < 1) return 'פחות מדקה';
    if (minutes < 60) return `${minutes} דק׳`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours} שע׳ ${rest} דק׳` : `${hours} שע׳`;
}
