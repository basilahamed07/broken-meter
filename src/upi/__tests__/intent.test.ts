import { prepareUpiUri } from '../intent';

describe('prepareUpiUri', () => {
  it('adds cu=INR when missing', () => {
    expect(prepareUpiUri('upi://pay?pa=a@b&pn=X&am=10')).toBe('upi://pay?pa=a@b&pn=X&am=10&cu=INR');
  });
  it('keeps an existing cu', () => {
    expect(prepareUpiUri('upi://pay?pa=a@b&cu=INR')).toBe('upi://pay?pa=a@b&cu=INR');
  });
  it('detects cu in any case', () => {
    expect(prepareUpiUri('upi://pay?pa=a@b&CU=INR')).toBe('upi://pay?pa=a@b&CU=INR');
  });
  it('preserves encoded characters and signature params exactly', () => {
    const raw = 'upi://pay?pa=shop@okbank&pn=My%20Shop%26Co&tn=a+b&mc=5411&tr=T1&sign=AbC/+==&mode=02';
    expect(prepareUpiUri(raw)).toBe(raw + '&cu=INR');
  });
  it('handles a trailing &', () => {
    expect(prepareUpiUri('upi://pay?pa=a@b&')).toBe('upi://pay?pa=a@b&cu=INR');
  });
  it('handles no query', () => {
    expect(prepareUpiUri('upi://pay')).toBe('upi://pay?cu=INR');
  });
  it('handles a bare question mark', () => {
    expect(prepareUpiUri('upi://pay?')).toBe('upi://pay?cu=INR');
  });
  it('does not treat a value containing cu as the key', () => {
    expect(prepareUpiUri('upi://pay?pa=cu@b')).toBe('upi://pay?pa=cu@b&cu=INR');
  });
  it('returns non-upi input unchanged', () => {
    expect(prepareUpiUri('https://example.com?a=1')).toBe('https://example.com?a=1');
  });
  it('trims and handles empty', () => {
    expect(prepareUpiUri('  upi://pay?pa=a@b  ')).toBe('upi://pay?pa=a@b&cu=INR');
    expect(prepareUpiUri('')).toBe('');
  });
});
