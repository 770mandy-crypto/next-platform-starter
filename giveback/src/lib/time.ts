export function timeAgo(iso: string, now = Date.now()) {
  const minutes = Math.round((now - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'עכשיו';
  if (minutes < 60) return `לפני ${minutes} דק׳`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? 'לפני שעה' : `לפני ${hours} שעות`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'אתמול';
  if (days < 30) return `לפני ${days} ימים`;
  return new Date(iso).toLocaleDateString('he-IL');
}

export function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}
