import { computeStreak, dayKey } from '../streak';
import { matchPending } from '../pending';

const d = (m: number, day: number) => new Date(2026, m - 1, day);
const limits = [{ id: 1, monthlyLimit: 3000_00 }]; // 100/day over 30 days

describe('streak', () => {
  const start = d(6, 1);
  it('counts clean days back from today', () => {
    expect(computeStreak(new Map(), limits, 30, start, d(6, 4))).toBe(4);
  });
  it('a bad day breaks the streak', () => {
    const m = new Map([[dayKey(d(6, 2)), new Map([[1, 500_00]])]]);
    expect(computeStreak(m, limits, 30, start, d(6, 4))).toBe(2); // days 3 and 4
  });
  it('today over share -> streak counts up to yesterday', () => {
    const m = new Map([[dayKey(d(6, 4)), new Map([[1, 500_00]])]]);
    expect(computeStreak(m, limits, 30, start, d(6, 4))).toBe(3);
  });
  it('does not count before cycle start', () => {
    expect(computeStreak(new Map(), limits, 30, start, d(6, 1))).toBe(1);
  });
});

describe('matchPending', () => {
  const now = 1_000_000_000;
  const p = [{ id: 1, amount: 800_00, createdAt: now - 5 * 60_000, status: 'pending' }];
  it('matches same amount within 10 min', () => expect(matchPending(p, 800_00, now)?.id).toBe(1));
  it('no match for different amount', () => expect(matchPending(p, 700_00, now)).toBeNull());
  it('no match outside window', () => expect(matchPending(p, 800_00, now + 30 * 60_000)).toBeNull());
  it('ignores non-pending', () => expect(matchPending([{ ...p[0], status: 'confirmed' }], 800_00, now)).toBeNull());
});
