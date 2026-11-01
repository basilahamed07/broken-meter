import { toPaise } from '../lib/money';

export interface UpiPayment {
  pa: string; // payee VPA
  pn: string; // payee name
  am: number | null; // paise, null if the QR has no amount
  tn: string; // transaction note
  mc: string; // merchant category code
  raw: string; // the ORIGINAL string, launched unchanged
}

const VPA = /^[a-zA-Z0-9._-]{1,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;
export const isValidVpa = (s: string): boolean => VPA.test(s.trim());

function decode(v: string): string {
  try {
    return decodeURIComponent(v.replace(/\+/g, ' ')).trim();
  } catch {
    return v.trim();
  }
}

/** Parse a `upi://pay?...` string. Returns null if it isn't a usable UPI payment QR. */
export function parseUpiQr(input: string): UpiPayment | null {
  const raw = input.trim();
  const m = /^upi:\/\/pay\?(.*)$/i.exec(raw);
  if (!m) return null;
  const params: Record<string, string> = {};
  for (const part of m[1].split('&')) {
    if (!part) continue;
    const i = part.indexOf('=');
    const k = (i < 0 ? part : part.slice(0, i)).toLowerCase();
    const v = i < 0 ? '' : decode(part.slice(i + 1));
    if (!(k in params)) params[k] = v;
  }
  const pa = params.pa ?? '';
  if (!isValidVpa(pa)) return null;
  let am: number | null = null;
  if (params.am) {
    const n = parseFloat(params.am);
    if (Number.isFinite(n) && n > 0) am = toPaise(n);
  }
  return { pa, pn: params.pn ?? '', am, tn: params.tn ?? '', mc: params.mc ?? '', raw };
}

/** Display name for a payee: merchant name, else the VPA's local part. */
export const payeeLabel = (p: Pick<UpiPayment, 'pa' | 'pn'>): string => p.pn || p.pa.split('@')[0];
