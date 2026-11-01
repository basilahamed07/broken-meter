import { addDays, ordinal, startOfDay } from '../lib/dates';
import { Cycle } from './cycle';

export interface Forecast {
  remaining: number; // paise (can be negative)
  dailyRate: number; // paise/day
  /** null when on track for the full cycle */
  runsOutDate: Date | null;
  daysLasting: number | null;
  onTrack: boolean;
}

export function computeForecast(income: number, spent: number, cycle: Cycle, today: Date): Forecast {
  const remaining = income - spent;
  const dailyRate = spent / Math.max(1, cycle.daysElapsed);
  if (remaining <= 0) {
    return { remaining, dailyRate, runsOutDate: startOfDay(today), daysLasting: 0, onTrack: false };
  }
  if (dailyRate <= 0) {
    return { remaining, dailyRate, runsOutDate: null, daysLasting: null, onTrack: true };
  }
  const daysLasting = Math.floor(remaining / dailyRate);
  const runsOutDate = addDays(startOfDay(today), daysLasting);
  if (runsOutDate.getTime() > cycle.end.getTime()) {
    return { remaining, dailyRate, runsOutDate: null, daysLasting, onTrack: true };
  }
  return { remaining, dailyRate, runsOutDate, daysLasting, onTrack: false };
}

export function forecastLine(f: Forecast): string {
  if (f.remaining <= 0) return 'Money is already gone this cycle';
  if (f.onTrack) return 'On track for the full month';
  return `Lasts till the ${ordinal(f.runsOutDate!.getDate())} at this speed`;
}
