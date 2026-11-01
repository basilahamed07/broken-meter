import type { Category, Settings, Transaction } from '../db/types';

export const BACKUP_VERSION = 1;

export interface BackupData {
  app: 'broke-meter';
  version: number;
  exportedAt: number;
  settings: Settings;
  categories: Category[];
  transactions: Transaction[];
  payeeMemory: { payee: string; categoryId: number; count: number }[];
  savingsEvents: { id: number; amount: number; payee: string; createdAt: number }[];
}

const csvCell = (v: string | number): string => {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(txs: Transaction[], cats: Pick<Category, 'id' | 'name'>[]): string {
  const name = new Map(cats.map((c) => [c.id, c.name]));
  const rows = [['date', 'amount_rupees', 'category', 'payee', 'note', 'source', 'status']];
  for (const t of txs) {
    rows.push([
      new Date(t.createdAt).toISOString(), (t.amount / 100).toFixed(2), name.get(t.categoryId ?? -1) ?? '', t.payee, t.note, t.source, t.status,
    ]);
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Validate untrusted import JSON. Throws a readable Error if it is not a Broke Meter backup. */
export function parseBackup(text: string): BackupData {
  let o: any;
  try {
    o = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  if (!o || o.app !== 'broke-meter') throw new Error('This is not a Broke Meter backup.');
  if (!isNum(o.version) || o.version > BACKUP_VERSION) throw new Error('This backup is from a newer version of the app.');
  if (!o.settings || !isNum(o.settings.income) || !isNum(o.settings.salaryDay)) throw new Error('Backup settings are missing.');
  if (!Array.isArray(o.categories) || !Array.isArray(o.transactions)) throw new Error('Backup data is incomplete.');
  for (const c of o.categories) {
    if (!isNum(c.id) || typeof c.name !== 'string' || typeof c.emoji !== 'string' || !isNum(c.monthlyLimit)) throw new Error('A category in the backup is invalid.');
  }
  for (const t of o.transactions) {
    if (!isNum(t.id) || !isNum(t.amount) || !isNum(t.createdAt) || typeof t.payee !== 'string') throw new Error('A transaction in the backup is invalid.');
    if (!['pending', 'confirmed', 'cancelled'].includes(t.status) || !['qr', 'p2p', 'sms', 'manual'].includes(t.source)) throw new Error('A transaction in the backup is invalid.');
  }
  return {
    app: 'broke-meter',
    version: o.version,
    exportedAt: isNum(o.exportedAt) ? o.exportedAt : Date.now(),
    settings: {
      income: o.settings.income,
      salaryDay: Math.min(31, Math.max(1, Math.round(o.settings.salaryDay))),
      roastLanguage: ['english', 'tanglish', 'mix'].includes(o.settings.roastLanguage) ? o.settings.roastLanguage : 'mix',
      onboardingDone: true,
    },
    categories: o.categories,
    transactions: o.transactions.map((t: any) => ({ note: '', categoryId: null, smsHash: null, ...t })),
    payeeMemory: Array.isArray(o.payeeMemory) ? o.payeeMemory : [],
    savingsEvents: Array.isArray(o.savingsEvents) ? o.savingsEvents : [],
  };
}
