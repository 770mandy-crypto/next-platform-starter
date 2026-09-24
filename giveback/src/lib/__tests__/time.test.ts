import { timeAgo } from '../time';

describe('timeAgo', () => {
  const now = new Date('2026-09-24T12:00:00Z').getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('speaks Hebrew', () => {
    expect(timeAgo(ago(10_000), now)).toBe('עכשיו');
    expect(timeAgo(ago(5 * 60_000), now)).toBe('לפני 5 דק׳');
    expect(timeAgo(ago(60 * 60_000), now)).toBe('לפני שעה');
    expect(timeAgo(ago(3 * 3600_000), now)).toBe('לפני 3 שעות');
    expect(timeAgo(ago(26 * 3600_000), now)).toBe('אתמול');
    expect(timeAgo(ago(5 * 86400_000), now)).toBe('לפני 5 ימים');
  });
});
