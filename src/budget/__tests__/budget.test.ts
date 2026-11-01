import { getCycle } from '../cycle';
import { computeForecast, forecastLine } from '../forecast';
import { getLevel, isEscalation } from '../levels';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe('cycle', () => {
  it('salary day 1 mid-month', () => {
    const c = getCycle(d(2026, 6, 10), 1);
    expect(c.start).toEqual(d(2026, 6, 1));
    expect(c.end).toEqual(d(2026, 6, 30));
    expect(c.totalDays).toBe(30);
    expect(c.daysElapsed).toBe(10);
    expect(c.daysLeft).toBe(21);
  });
  it('before salary day belongs to previous cycle', () => {
    const c = getCycle(d(2026, 6, 3), 5);
    expect(c.start).toEqual(d(2026, 5, 5));
    expect(c.end).toEqual(d(2026, 6, 4));
  });
  it('day 31 clamps to last day of short months', () => {
    const c = getCycle(d(2026, 2, 28), 31);
    expect(c.start).toEqual(d(2026, 2, 28));
    expect(c.end).toEqual(d(2026, 3, 30));
    const c2 = getCycle(d(2026, 3, 15), 31);
    expect(c2.start).toEqual(d(2026, 2, 28));
  });
  it('year boundary', () => {
    const c = getCycle(d(2026, 1, 2), 15);
    expect(c.start).toEqual(d(2025, 12, 15));
    expect(c.end).toEqual(d(2026, 1, 14));
  });
  it('salary day is first day, daysElapsed = 1', () => {
    expect(getCycle(d(2026, 6, 1), 1).daysElapsed).toBe(1);
  });
});

describe('forecast', () => {
  const cycle = getCycle(d(2026, 6, 10), 1);
  it('runs out before cycle end', () => {
    // spent 14000 in 10 days -> 1400/day, remaining 6000 -> 4 days
    const f = computeForecast(20000_00, 14000_00, cycle, d(2026, 6, 10));
    expect(f.daysLasting).toBe(4);
    expect(f.onTrack).toBe(false);
    expect(forecastLine(f)).toBe('Lasts till the 14th at this speed');
  });
  it('on track when spend is slow', () => {
    const f = computeForecast(20000_00, 2000_00, cycle, d(2026, 6, 10));
    expect(f.onTrack).toBe(true);
    expect(forecastLine(f)).toBe('On track for the full month');
  });
  it('zero spend is on track', () => {
    expect(computeForecast(20000_00, 0, cycle, d(2026, 6, 10)).onTrack).toBe(true);
  });
  it('overspent', () => {
    const f = computeForecast(20000_00, 25000_00, cycle, d(2026, 6, 10));
    expect(f.remaining).toBe(-5000_00);
    expect(f.daysLasting).toBe(0);
  });
});

describe('levels', () => {
  it('boundaries', () => {
    expect(getLevel(49, 100)).toBe('chill');
    expect(getLevel(50, 100)).toBe('warning');
    expect(getLevel(74, 100)).toBe('warning');
    expect(getLevel(75, 100)).toBe('danger');
    expect(getLevel(100, 100)).toBe('danger');
    expect(getLevel(101, 100)).toBe('broke');
  });
  it('zero limit', () => {
    expect(getLevel(0, 0)).toBe('chill');
    expect(getLevel(5, 0)).toBe('broke');
  });
  it('escalation', () => {
    expect(isEscalation('chill', 'warning')).toBe(true);
    expect(isEscalation('danger', 'warning')).toBe(false);
  });
});
