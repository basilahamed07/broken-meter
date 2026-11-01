import { isValidVpa, parseUpiQr, payeeLabel } from '../qrParser';

describe('parseUpiQr', () => {
  it('parses a full merchant QR', () => {
    const raw = 'upi://pay?pa=dmart@icici&pn=Avenue%20Supermarts&am=1250.50&tn=Groceries&mc=5411&cu=INR';
    const p = parseUpiQr(raw)!;
    expect(p.pa).toBe('dmart@icici');
    expect(p.pn).toBe('Avenue Supermarts');
    expect(p.am).toBe(125050);
    expect(p.tn).toBe('Groceries');
    expect(p.mc).toBe('5411');
    expect(p.raw).toBe(raw);
  });
  it('amount missing -> null', () => {
    expect(parseUpiQr('upi://pay?pa=shop@okaxis&pn=Shop')!.am).toBeNull();
  });
  it('zero or bad amount -> null', () => {
    expect(parseUpiQr('upi://pay?pa=shop@okaxis&am=0')!.am).toBeNull();
    expect(parseUpiQr('upi://pay?pa=shop@okaxis&am=abc')!.am).toBeNull();
  });
  it('plus signs and encoded characters', () => {
    expect(parseUpiQr('upi://pay?pa=a.b@paytm&pn=Sri+Lakshmi+Stores')!.pn).toBe('Sri Lakshmi Stores');
    expect(parseUpiQr('upi://pay?pa=a@ybl&pn=Tom%20%26%20Jerry')!.pn).toBe('Tom & Jerry');
  });
  it('case-insensitive scheme and keys', () => {
    expect(parseUpiQr('UPI://PAY?PA=x@upi&PN=X')!.pa).toBe('x@upi');
  });
  it('rejects non-UPI or invalid payee', () => {
    expect(parseUpiQr('https://example.com')).toBeNull();
    expect(parseUpiQr('upi://pay?pn=NoVpa')).toBeNull();
    expect(parseUpiQr('upi://pay?pa=notavpa')).toBeNull();
  });
  it('payee label falls back to VPA', () => {
    expect(payeeLabel({ pa: 'chai.wala@okhdfc', pn: '' })).toBe('chai.wala');
    expect(payeeLabel({ pa: 'x@y1', pn: 'Name' })).toBe('Name');
  });
});

describe('isValidVpa', () => {
  it('works', () => {
    expect(isValidVpa('9876543210@ybl')).toBe(true);
    expect(isValidVpa('name@')).toBe(false);
    expect(isValidVpa('no-at-sign')).toBe(false);
  });
});
