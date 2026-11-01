/** Money is stored as integer paise. */
export const toPaise = (rupees: number): number => Math.round(rupees * 100);
export const toRupees = (paise: number): number => paise / 100;

/** Indian digit grouping: 1234567 -> 12,34,567 */
export function groupIndian(n: number): string {
  const s = Math.abs(Math.round(n)).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

/** paise -> "₹1,234" (drops paise unless non-zero) */
export function formatRupees(paise: number): string {
  const neg = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const rem = abs % 100;
  const base = `₹${groupIndian(rupees)}`;
  return neg + (rem ? `${base}.${rem.toString().padStart(2, '0')}` : base);
}

/** Parse user text like "1,200" or "350.50" into paise. Returns 0 if invalid. */
export function parseAmountToPaise(text: string): number {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const v = parseFloat(cleaned);
  return Number.isFinite(v) && v > 0 ? toPaise(v) : 0;
}
