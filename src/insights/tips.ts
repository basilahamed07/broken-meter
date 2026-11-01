import { formatRupees } from '../lib/money';
import type { Level } from '../budget/levels';

export interface TipInput {
  categoryName: string;
  level: Level;
  txCount: number;
  spent: number; // paise
  limit: number; // paise
  daysLeft: number;
  topPayee?: { name: string; count: number } | null;
}

/** Rule-based tip. No AI, just arithmetic. */
export function categoryTip(i: TipInput): string {
  const name = i.categoryName.toLowerCase();
  const avg = i.txCount ? Math.round(i.spent / i.txCount) : 0;
  if (i.txCount > 8 && /food|eat|dining|restaurant|delivery/.test(name)) {
    const n = 3;
    return `Cooking ${n} dinners at home saves about ${formatRupees(avg * n)}`;
  }
  if (i.topPayee && i.topPayee.count >= 4) {
    return `${i.topPayee.name} showed up ${i.topPayee.count} times here. Cutting one visit saves about ${formatRupees(avg)}`;
  }
  if (i.level === 'broke') {
    const over = i.spent - i.limit;
    return `You're ${formatRupees(over)} over. Pause ${i.categoryName} spends for the next ${Math.max(1, Math.min(i.daysLeft, 7))} days to recover`;
  }
  if (i.level === 'danger' && i.daysLeft > 0) {
    const perDay = Math.max(0, Math.floor((i.limit - i.spent) / i.daysLeft));
    return `Only ${formatRupees(perDay)} a day is safe for ${i.categoryName} until the cycle ends`;
  }
  if (i.txCount >= 3 && avg > 0) return `Your average ${i.categoryName} spend is ${formatRupees(avg)}. Small ones add up`;
  return 'Add expenses as you go so the forecast stays honest';
}

export interface OverallTipInput {
  foodCategoryName?: string;
  foodOrderCount: number;
  avgFoodOrder: number; // paise
  biggestCategoryName?: string;
  topPayee?: { name: string; count: number } | null;
  remaining: number;
  daysLeft: number;
}

/** One rule-based tip for the Insights screen. */
export function insightsTip(i: OverallTipInput): string {
  if (i.foodOrderCount > 8) {
    return `Cooking 3 dinners at home saves about ${formatRupees(i.avgFoodOrder * 3)}`;
  }
  if (i.remaining <= 0) return 'You are out of money for this cycle. Pause every non-essential spend until salary day';
  if (i.topPayee && i.topPayee.count >= 5) return `${i.topPayee.name} appeared ${i.topPayee.count} times. That habit adds up`;
  if (i.daysLeft > 0) {
    const perDay = Math.floor(i.remaining / i.daysLeft);
    return `Spending at most ${formatRupees(perDay)} a day keeps you inside the budget till salary day`;
  }
  return 'Add expenses as you go so the numbers stay honest';
}
