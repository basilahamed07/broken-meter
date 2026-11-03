/**
 * Make a upi://pay string safe for UPI apps without touching anything the QR signed.
 * Only one thing may change: a missing currency (cu) is appended as cu=INR. Every other character stays identical.
 */
export function prepareUpiUri(raw: string): string {
  const s = raw.trim();
  if (!/^upi:\/\/pay/i.test(s)) return s;
  const q = s.indexOf('?');
  const query = q === -1 ? '' : s.slice(q + 1);
  const hasCu = query.split('&').some((kv) => kv.split('=')[0].toLowerCase() === 'cu');
  if (hasCu) return s;
  if (q === -1) return `${s}?cu=INR`;
  if (query === '' || s.endsWith('&')) return `${s}cu=INR`;
  return `${s}&cu=INR`;
}
