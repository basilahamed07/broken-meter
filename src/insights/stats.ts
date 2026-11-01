import { dayKey } from '../budget/streak';
import type { Transaction } from '../db/types';

export const spendPerCategory = (txs: Transaction[]): Map<number | null, number> => {
  const m = new Map<number | null, number>();
  for (const t of txs) if (t.status !== 'cancelled') m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + t.amount);
  return m;
};

export function biggestDay(txs: Transaction[]): { date: Date; amount: number } | null {
  const byDay = new Map<string, { date: Date; amount: number }>();
  for (const t of txs) {
    if (t.status === 'cancelled') continue;
    const d = new Date(t.createdAt);
    const k = dayKey(d);
    const e = byDay.get(k) ?? { date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), amount: 0 };
    e.amount += t.amount;
    byDay.set(k, e);
  }
  let best: { date: Date; amount: number } | null = null;
  for (const e of byDay.values()) if (!best || e.amount > best.amount) best = e;
  return best;
}

export function topPayees(txs: Transaction[], n = 5): { payee: string; amount: number; count: number }[] {
  const m = new Map<string, { payee: string; amount: number; count: number }>();
  for (const t of txs) {
    if (t.status === 'cancelled' || !t.payee.trim()) continue;
    const k = t.payee.trim().toLowerCase();
    const e = m.get(k) ?? { payee: t.payee.trim(), amount: 0, count: 0 };
    e.amount += t.amount;
    e.count += 1;
    m.set(k, e);
  }
  return [...m.values()].sort((a, b) => b.amount - a.amount).slice(0, n);
}

/** % change vs last cycle per category. null when last cycle had nothing to compare to. */
export function compareCycles(cur: Map<number | null, number>, prev: Map<number | null, number>): Map<number | null, number | null> {
  const out = new Map<number | null, number | null>();
  for (const [id, v] of cur) {
    const p = prev.get(id) ?? 0;
    out.set(id, p > 0 ? Math.round(((v - p) / p) * 100) : null);
  }
  return out;
}

export const formatPct = (p: number): string => `${p >= 0 ? '+' : ''}${p}%`;
