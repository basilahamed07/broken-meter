import { toPaise } from '../lib/money';

export interface ParsedSms {
  amount: number; // paise
  payee: string; // '' if unknown
  hash: string;
}

const OTP = /\botp\b|one[- ]time|verification code|\bpin\b|do not share/i;
const FAILED = /\bfail(ed|ure)?\b|declined|unsuccessful|not successful|could not|unable to|reversed|rejected/i;
const REFUND = /refund|cashback|reversal/i;
const PROMO = /\boffer\b|\d+%\s*off|apply now|click here|limited time|pre-?approved|congratulations|win\b|reward points|\bemi\b.*\bavail/i;
const DUE = /\bdue\b|bill generated|statement|minimum amount|min\.? due|reminder|auto-?pay.*(will|scheduled)/i;
const REQUEST = /collect request|requested money|has requested|payment request/i;
const DEBIT_KW = /\b(debited|debit|spent|paid|sent|purchase|withdrawn|used for|payment of|txn of|transaction of)\b|\bdr\b\.?/i;
const CREDIT_ONLY = /\b(credited|received|deposited)\b/i;

const AMOUNT_RE = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)|(?:debited|debit|paid|spent|sent|withdrawn)\s+(?:by|for|of|with)?\s*([\d,]+(?:\.\d{1,2})?)(?=\s|\.|$|,)/gi;
const BAL_CONTEXT = /(avl|avail\w*|bal\w*|limit|lmt|outstanding|total due)[^\d₹]{0,25}$/i;

/** 32-bit FNV-1a over a normalized body, used to avoid double counting the same SMS. */
export function smsHash(body: string, sender = ''): string {
  const s = `${sender.toLowerCase()}|${body.replace(/\s+/g, ' ').trim().toLowerCase()}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function findAmount(text: string): number | null {
  AMOUNT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = AMOUNT_RE.exec(text))) {
    const before = text.slice(Math.max(0, m.index - 30), m.index);
    if (BAL_CONTEXT.test(before)) continue; // skip "Avl bal Rs 1200"
    const num = parseFloat((m[1] ?? m[2]).replace(/,/g, ''));
    if (Number.isFinite(num) && num > 0) return toPaise(num);
  }
  return null;
}

const clean = (s: string): string =>
  s.replace(/\s+/g, ' ').replace(/\b(credited|debited|on|via|using|ref\w*|upi|from|a\/c.*)$/i, '').replace(/^[\s:;,.\-()]+|[\s:;,.\-()]+$/g, '').trim();

const STOP = String.raw`(?=\s+(?:on|ref\w*|upi|via|using|from|txn|avl|bal|credited|debited|if|not|call|dt|dated|at|for|with|thru|through)\b|\s*[.;,(]|\s+\d{2}[-/]|$)`;

function findPayee(text: string): string {
  const tries: RegExp[] = [
    /\bupi\/(?:p2[mp]|cr|dr)?\/?\d{6,}\/([A-Za-z0-9 &'._-]+?)(?=\s+not you|\s+sms|\s*$|\s*\.|\s*,)/i, // UPI/P2M/123/NAME
    /\bvpa\s+([\w.\-]+@[\w]+)(?:\s*\(([^)]+)\))?/i,
    /\bcredited to\s+(?:a\/c\s+\S+\s+)?([A-Za-z][A-Za-z0-9 .&'-]*?)\s+(?:via|on|upi|ref)\b/i, // credited to NAME via
    /\bto\s+([\w.\-]+@[\w]+)/i, // to arun@okhdfcbank
    new RegExp(String.raw`\b(?:trf to|transfer to|paid to|sent to|to)\s+([A-Za-z0-9][A-Za-z0-9 .&'@_-]*?)${STOP}`, 'i'),
    new RegExp(String.raw`\bat\s+([A-Za-z0-9][A-Za-z0-9 .&'_-]*?)${STOP}`, 'i'),
    /\binfo\s*[:\-]\s*([A-Za-z0-9 .&'/_-]+?)(?=\s*[.;,]|\s+on\b|$)/i,
    /;\s*([A-Za-z0-9 .&'-]+?)\s+credited/i, // ; BIGBASKET credited
    /\b\d{2}[-/]\d{2}[-/]\d{2,4}\s+\d{2}:\d{2}:\d{2}\s+([A-Za-z0-9 &'._-]+?)\s+(?:avl|if)\b/i, // Axis card: datetime MERCHANT Avl Lmt
  ];
  for (const re of tries) {
    const m = re.exec(text);
    if (!m) continue;
    const v = clean(m[1]);
    if (v && v.length >= 2 && !/^\d+$/.test(v) && !/^(your|you|a\/c|account|bank|ac|card)$/i.test(v)) return v;
  }
  if (/\batm\b|cash withdrawal|withdrawn/i.test(text)) return 'ATM withdrawal';
  return '';
}

/** Parse an Indian bank/UPI debit SMS. Returns null for OTPs, credits, refunds, failures and promos. */
export function parseDebitSms(body: string, sender = ''): ParsedSms | null {
  const text = body.replace(/\s+/g, ' ').trim();
  if (!text) return null;
  if (OTP.test(text) || FAILED.test(text) || REFUND.test(text) || PROMO.test(text) || DUE.test(text) || REQUEST.test(text)) return null;
  if (!DEBIT_KW.test(text)) return null;
  // "credited"/"received" without any debit wording is a credit
  if (CREDIT_ONLY.test(text) && !/\b(debited|debit|spent|paid|sent|withdrawn|used for|purchase)\b/i.test(text)) return null;
  const amount = findAmount(text);
  if (!amount) return null;
  return { amount, payee: findPayee(text), hash: smsHash(body, sender) };
}
