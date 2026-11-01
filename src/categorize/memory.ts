/** Normalise a payee so "SWIGGY*ORDER 123", "swiggy" and "Swiggy " are the same key. */
export function normalizePayee(payee: string): string {
  return payee
    .toLowerCase()
    .replace(/@[a-z0-9]+$/i, '') // drop VPA handle: arun@okhdfcbank -> arun
    .replace(/\b(upi|pvt|ltd|private|limited|india|stores?)\b/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\b\d{4,}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
