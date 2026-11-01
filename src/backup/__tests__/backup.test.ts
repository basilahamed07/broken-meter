import { parseBackup, toCsv } from '../backup';

const good = {
  app: 'broke-meter', version: 1, exportedAt: 1,
  settings: { income: 2000000, salaryDay: 1, roastLanguage: 'mix', onboardingDone: true },
  categories: [{ id: 1, name: 'Food', emoji: '🍔', monthlyLimit: 250000, sortOrder: 0 }],
  transactions: [{ id: 1, amount: 35000, categoryId: 1, payee: 'Swiggy, "Indiranagar"', note: 'line\nbreak', source: 'manual', status: 'confirmed', smsHash: null, createdAt: 1700000000000 }],
};

describe('backup', () => {
  it('accepts a valid backup', () => {
    const b = parseBackup(JSON.stringify(good));
    expect(b.transactions).toHaveLength(1);
    expect(b.payeeMemory).toEqual([]);
  });
  it('rejects garbage', () => {
    expect(() => parseBackup('nope')).toThrow(/valid JSON/);
    expect(() => parseBackup('{}')).toThrow(/not a Broke Meter/);
    expect(() => parseBackup(JSON.stringify({ ...good, version: 99 }))).toThrow(/newer/);
    expect(() => parseBackup(JSON.stringify({ ...good, transactions: [{ id: 1 }] }))).toThrow(/transaction/);
  });
  it('clamps salary day', () => {
    expect(parseBackup(JSON.stringify({ ...good, settings: { ...good.settings, salaryDay: 99 } })).settings.salaryDay).toBe(31);
  });
  it('csv escapes quotes, commas and newlines', () => {
    const csv = toCsv(good.transactions as any, good.categories);
    expect(csv.split('\n')[0]).toBe('date,amount_rupees,category,payee,note,source,status');
    expect(csv).toContain('"Swiggy, ""Indiranagar"""');
    expect(csv).toContain('350.00,Food');
  });
});
