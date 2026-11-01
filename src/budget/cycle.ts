import { addDays, daysInMonth, diffDays, startOfDay } from '../lib/dates';

export interface Cycle {
  start: Date;
  /** last day of the cycle (inclusive) */
  end: Date;
  totalDays: number;
  daysElapsed: number; // >= 1
  daysLeft: number; // >= 0, counting today
}

/** Salary day clamped to a given month (day 31 in Feb -> 28/29). */
function salaryDateIn(year: number, month: number, salaryDay: number): Date {
  return new Date(year, month, Math.min(salaryDay, daysInMonth(year, month)));
}

export function getCycle(today: Date, salaryDay: number): Cycle {
  const t = startOfDay(today);
  let start = salaryDateIn(t.getFullYear(), t.getMonth(), salaryDay);
  if (start.getTime() > t.getTime()) {
    const pm = t.getMonth() === 0 ? 11 : t.getMonth() - 1;
    const py = t.getMonth() === 0 ? t.getFullYear() - 1 : t.getFullYear();
    start = salaryDateIn(py, pm, salaryDay);
  }
  const nm = start.getMonth() === 11 ? 0 : start.getMonth() + 1;
  const ny = start.getMonth() === 11 ? start.getFullYear() + 1 : start.getFullYear();
  const nextStart = salaryDateIn(ny, nm, salaryDay);
  const end = addDays(nextStart, -1);
  const totalDays = diffDays(start, nextStart);
  const daysElapsed = Math.max(1, diffDays(start, t) + 1);
  const daysLeft = Math.max(0, diffDays(t, end) + 1);
  return { start, end, totalDays, daysElapsed, daysLeft };
}
