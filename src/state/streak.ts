import { getCycle } from '../budget/cycle';
import { computeStreak, dayKey } from '../budget/streak';
import * as q from '../db/queries';
import { addDays } from '../lib/dates';

export async function loadStreak(): Promise<number> {
  const s = await q.getSettings();
  const today = new Date();
  const cycle = getCycle(today, s.salaryDay);
  const txs = await q.transactionsBetween(cycle.start.getTime(), addDays(cycle.end, 1).getTime());
  const daily = new Map<string, Map<number, number>>();
  for (const t of txs) {
    if (t.categoryId == null) continue;
    const k = dayKey(new Date(t.createdAt));
    const m = daily.get(k) ?? new Map<number, number>();
    m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + t.amount);
    daily.set(k, m);
  }
  const cats = await q.listCategories();
  return computeStreak(daily, cats, cycle.totalDays, cycle.start, today);
}
