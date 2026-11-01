import { addDays, diffDays, startOfDay } from '../lib/dates';

/**
 * Streak = consecutive days (ending yesterday, plus today if today is still clean)
 * with no category going over its daily share of its monthly limit.
 * dailySpend: dayKey -> (categoryId -> paise)
 */
export const dayKey = (d: Date): string => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export function computeStreak(
  dailySpend: Map<string, Map<number, number>>,
  limits: { id: number; monthlyLimit: number }[],
  cycleDays: number,
  cycleStart: Date,
  today: Date,
): number {
  const t = startOfDay(today);
  const clean = (d: Date): boolean => {
    const spend = dailySpend.get(dayKey(d));
    if (!spend) return true;
    return limits.every((c) => (spend.get(c.id) ?? 0) <= c.monthlyLimit / Math.max(1, cycleDays));
  };
  // today counts only while it is still clean; otherwise count back from yesterday
  let d = clean(t) ? t : addDays(t, -1);
  let streak = 0;
  while (diffDays(cycleStart, d) >= 0 && clean(d)) {
    streak += 1;
    d = addDays(d, -1);
  }
  return streak;
}
