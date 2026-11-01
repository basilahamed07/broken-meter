import { parseDebitSms, smsHash } from '../parser';
import { SAMPLES } from '../samples';

describe('parseDebitSms samples', () => {
  for (const s of SAMPLES) {
    it(s.name, () => {
      const r = parseDebitSms(s.body, s.sender);
      if (!s.expect) {
        expect(r).toBeNull();
      } else {
        expect(r).not.toBeNull();
        expect(r!.amount).toBe(s.expect.amount);
        expect(r!.payee.toLowerCase()).toBe(s.expect.payee.toLowerCase());
      }
    });
  }
});

describe('amount formats', () => {
  it.each([
    ['Rs 450 debited from A/c XX12', 45000],
    ['Rs.450.00 debited from A/c XX12', 45000],
    ['INR 1,200 debited from A/c XX12', 120000],
    ['₹99 debited from A/c XX12', 9900],
  ])('%s', (body, amt) => {
    expect(parseDebitSms(body)!.amount).toBe(amt);
  });
});

describe('hash', () => {
  it('is stable and whitespace-insensitive', () => {
    expect(smsHash('a  b', 'X')).toBe(smsHash('a b', 'x'));
    expect(smsHash('a b')).not.toBe(smsHash('a c'));
  });
});
