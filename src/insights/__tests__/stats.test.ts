import { biggestDay, compareCycles, formatPct, spendPerCategory, topPayees } from '../stats';
import { insightsTip } from '../tips';
import type { Transaction } from '../../db/types';

let id = 0;
const tx = (amount: number, cat: number | null, payee: string, day: number, status: Transaction['status'] = 'confirmed'): Transaction => ({
  id: ++id, amount, categoryId: cat, payee, note: '', source: 'manual', status, smsHash: null, createdAt: new Date(2026, 5, day, 12).getTime(),
});

const txs = [tx(500_00, 1, 'DMart', 2), tx(300_00, 2, 'Swiggy', 3), tx(200_00, 2, 'swiggy', 3), tx(900_00, 3, 'Uber', 5), tx(400_00, 2, 'Zomato', 5, 'cancelled')];

it('spend per category ignores cancelled', () => {
  const m = spendPerCategory(txs);
  expect(m.get(2)).toBe(500_00);
  expect(m.get(1)).toBe(500_00);
});
it('biggest day', () => {
  const b = biggestDay(txs)!;
  expect(b.date.getDate()).toBe(5);
  expect(b.amount).toBe(900_00);
});
it('top payees merges case and sorts', () => {
  const t = topPayees(txs, 5);
  expect(t[0]).toMatchObject({ payee: 'Uber', amount: 900_00 });
  expect(t.find((p) => p.payee.toLowerCase() === 'swiggy')!.count).toBe(2);
  expect(t.some((p) => p.payee === 'Zomato')).toBe(false);
});
it('cycle comparison', () => {
  const c = compareCycles(new Map([[2, 130_00], [3, 50_00]]), new Map([[2, 100_00]]));
  expect(c.get(2)).toBe(30);
  expect(c.get(3)).toBeNull();
  expect(formatPct(30)).toBe('+30%');
  expect(formatPct(-12)).toBe('-12%');
});
it('tip: food delivery > 8', () => {
  expect(insightsTip({ foodOrderCount: 9, avgFoodOrder: 200_00, remaining: 5000_00, daysLeft: 10 })).toBe('Cooking 3 dinners at home saves about ₹600');
});
it('tip: out of money', () => {
  expect(insightsTip({ foodOrderCount: 1, avgFoodOrder: 0, remaining: -1, daysLeft: 5 })).toMatch(/out of money/);
});
