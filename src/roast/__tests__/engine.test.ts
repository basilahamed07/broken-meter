import { allLines, contextRoast, fill, pickRoast } from '../engine';

const levels = ['chill', 'warning', 'danger', 'broke'] as const;

describe('roast bank', () => {
  it('has >= 15 lines per level in every group, both languages', () => {
    for (const g of ['category', 'beforePay', 'overall'] as const) {
      for (const l of levels) {
        const lines = allLines[g][l];
        expect(lines.length).toBeGreaterThanOrEqual(15);
        for (const line of lines) { expect(line.en.length).toBeGreaterThan(0); expect(line.ta.length).toBeGreaterThan(0); }
      }
    }
    expect(allLines.win.length).toBeGreaterThanOrEqual(15);
  });
  it('ids are unique', () => {
    const ids: string[] = [];
    for (const g of ['category', 'beforePay', 'overall'] as const) for (const l of levels) allLines[g][l].forEach((x) => ids.push(x.id));
    allLines.win.forEach((x) => ids.push(x.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('only known placeholders are used', () => {
    const ok = new Set(['amount', 'left', 'days', 'category', 'count', 'date']);
    const text = JSON.stringify(allLines);
    for (const m of text.matchAll(/\{(\w+)\}/g)) expect(ok.has(m[1])).toBe(true);
  });
});

describe('engine', () => {
  it('fills placeholders', () => {
    expect(fill('₹{amount} on {category}', { amount: 200, category: 'Food' })).toBe('₹200 on Food');
  });
  it('never repeats any of the last 5 shown', () => {
    const history: string[] = [];
    for (let i = 0; i < 200; i++) {
      const r = pickRoast('category', 'broke', 'english', { category: 'Food', amount: 1 }, history);
      expect(history.slice(-5)).not.toContain(r.id);
      history.push(r.id);
    }
  });
  it('respects language', () => {
    const en = pickRoast('win', 'chill', 'english', { amount: 800 }, [], () => 0);
    const ta = pickRoast('win', 'chill', 'tanglish', { amount: 800 }, [], () => 0);
    expect(en.text).toContain('Semma move');
    expect(ta.text).toContain('save pannita');
  });
  it('mix uses both languages', () => {
    const seen = new Set<string>();
    let i = 0;
    const seq = [0, 0.1, 0, 0.9];
    for (let n = 0; n < 4; n++) seen.add(pickRoast('win', 'chill', 'mix', { amount: 1 }, [], () => seq[i++ % seq.length]).text);
    expect(seen.size).toBeGreaterThan(1);
  });
  it('context lines', () => {
    expect(contextRoast(new Date(2026, 5, 3, 14), 'Food', 4, 'english')!.text).toContain('Food');
    expect(contextRoast(new Date(2026, 5, 3, 2), 'Food', 1, 'english')).not.toBeNull();
    expect(contextRoast(new Date(2026, 5, 6, 14), 'Food', 1, 'english')).not.toBeNull(); // Saturday
    expect(contextRoast(new Date(2026, 5, 3, 14), 'Food', 1, 'english')).toBeNull(); // Wednesday
  });
});
