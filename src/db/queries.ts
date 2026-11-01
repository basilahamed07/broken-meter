import * as SQLite from 'expo-sqlite';
import { NbModel, newModel, tokenize } from '../categorize/naiveBayes';
import type { Lang } from '../roast/engine';
import { migrate } from './migrations';
import type { Category, NewTransaction, Settings, Transaction } from './types';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('brokemeter.db');
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}

/* ---------- settings ---------- */
export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ income: number; salary_day: number; roast_language: string; onboarding_done: number }>(
    'SELECT * FROM settings WHERE id = 1',
  );
  return {
    income: r?.income ?? 0,
    salaryDay: r?.salary_day ?? 1,
    roastLanguage: (r?.roast_language as Lang) ?? 'mix',
    onboardingDone: !!r?.onboarding_done,
  };
}

export async function saveSettings(p: Partial<Settings>): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const args: (string | number)[] = [];
  if (p.income !== undefined) { sets.push('income = ?'); args.push(p.income); }
  if (p.salaryDay !== undefined) { sets.push('salary_day = ?'); args.push(p.salaryDay); }
  if (p.roastLanguage !== undefined) { sets.push('roast_language = ?'); args.push(p.roastLanguage); }
  if (p.onboardingDone !== undefined) { sets.push('onboarding_done = ?'); args.push(p.onboardingDone ? 1 : 0); }
  if (!sets.length) return;
  await db.runAsync(`UPDATE settings SET ${sets.join(', ')} WHERE id = 1`, args);
}

/* ---------- categories ---------- */
type CatRow = { id: number; name: string; emoji: string; monthly_limit: number; sort_order: number };
const toCat = (r: CatRow): Category => ({ id: r.id, name: r.name, emoji: r.emoji, monthlyLimit: r.monthly_limit, sortOrder: r.sort_order });

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CatRow>('SELECT * FROM categories WHERE archived = 0 ORDER BY sort_order, id');
  return rows.map(toCat);
}

export async function addCategory(c: { name: string; emoji: string; monthlyLimit: number }): Promise<number> {
  const db = await getDb();
  const m = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM categories');
  const res = await db.runAsync(
    'INSERT INTO categories (name, emoji, monthly_limit, sort_order) VALUES (?, ?, ?, ?)',
    [c.name.trim(), c.emoji, c.monthlyLimit, (m?.m ?? -1) + 1],
  );
  return res.lastInsertRowId;
}

export async function updateCategory(id: number, c: { name: string; emoji: string; monthlyLimit: number }): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE categories SET name = ?, emoji = ?, monthly_limit = ? WHERE id = ?', [c.name.trim(), c.emoji, c.monthlyLimit, id]);
}

export async function reorderCategories(idsInOrder: number[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < idsInOrder.length; i++) {
      await db.runAsync('UPDATE categories SET sort_order = ? WHERE id = ?', [i, idsInOrder[i]]);
    }
  });
}

/** Delete a category; its transactions move to `reassignTo` (or become uncategorised). */
export async function deleteCategory(id: number, reassignTo: number | null): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE transactions SET category_id = ? WHERE category_id = ?', [reassignTo, id]);
    await db.runAsync('DELETE FROM payee_memory WHERE category_id = ?', [id]);
    await db.runAsync('DELETE FROM classifier_tokens WHERE category_id = ?', [id]);
    await db.runAsync('DELETE FROM level_alerts WHERE scope = ?', [`cat:${id}`]);
    await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  });
}

/* ---------- transactions ---------- */
type TxRow = {
  id: number; amount: number; category_id: number | null; payee: string; note: string;
  source: Transaction['source']; status: Transaction['status']; sms_hash: string | null; created_at: number;
};
const toTx = (r: TxRow): Transaction => ({
  id: r.id, amount: r.amount, categoryId: r.category_id, payee: r.payee, note: r.note,
  source: r.source, status: r.status, smsHash: r.sms_hash, createdAt: r.created_at,
});

export async function addTransaction(t: NewTransaction): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync(
    'INSERT INTO transactions (amount, category_id, payee, note, source, status, sms_hash, created_at) VALUES (?,?,?,?,?,?,?,?)',
    [t.amount, t.categoryId, t.payee.trim(), t.note.trim(), t.source ?? 'manual', t.status ?? 'confirmed', t.smsHash ?? null, t.createdAt ?? Date.now()],
  );
  return res.lastInsertRowId;
}

export async function updateTransaction(id: number, t: { amount: number; categoryId: number | null; payee: string; note: string }): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE transactions SET amount = ?, category_id = ?, payee = ?, note = ? WHERE id = ?', [t.amount, t.categoryId, t.payee.trim(), t.note.trim(), id]);
}

export async function deleteTransaction(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
}

export async function getTransaction(id: number): Promise<Transaction | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<TxRow>('SELECT * FROM transactions WHERE id = ?', [id]);
  return r ? toTx(r) : null;
}

export async function recentTransactions(limit = 10): Promise<Transaction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TxRow>("SELECT * FROM transactions WHERE status != 'cancelled' ORDER BY created_at DESC, id DESC LIMIT ?", [limit]);
  return rows.map(toTx);
}

export async function categoryTransactions(categoryId: number, from: number, to: number): Promise<Transaction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TxRow>(
    "SELECT * FROM transactions WHERE category_id = ? AND status != 'cancelled' AND created_at >= ? AND created_at < ? ORDER BY created_at DESC, id DESC",
    [categoryId, from, to],
  );
  return rows.map(toTx);
}

/** Spend per category id (null = uncategorised) for a cycle, excluding cancelled. */
export async function spentByCategory(from: number, to: number): Promise<Map<number | null, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ category_id: number | null; s: number }>(
    "SELECT category_id, SUM(amount) AS s FROM transactions WHERE status != 'cancelled' AND created_at >= ? AND created_at < ? GROUP BY category_id",
    [from, to],
  );
  return new Map(rows.map((r) => [r.category_id, r.s]));
}

export async function countToday(categoryId: number | null, dayStart: number): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ c: number }>(
    "SELECT COUNT(*) AS c FROM transactions WHERE status != 'cancelled' AND created_at >= ? AND category_id IS ?",
    [dayStart, categoryId],
  );
  return r?.c ?? 0;
}

/* ---------- level alerts ---------- */
export async function getAlertLevel(scope: string, cycleStart: number): Promise<string | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ level: string }>('SELECT level FROM level_alerts WHERE scope = ? AND cycle_start = ?', [scope, cycleStart]);
  return r?.level ?? null;
}
export async function setAlertLevel(scope: string, cycleStart: number, level: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO level_alerts (scope, cycle_start, level) VALUES (?,?,?)', [scope, cycleStart, level]);
}

/* ---------- roast history ---------- */
export async function recentRoastIds(limit = 5): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ roast_id: string }>('SELECT roast_id FROM roast_history ORDER BY shown_at DESC, rowid DESC LIMIT ?', [limit]);
  return rows.map((r) => r.roast_id).reverse();
}
export async function addRoastHistory(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO roast_history (roast_id, shown_at) VALUES (?, ?)', [id, Date.now()]);
  await db.runAsync('DELETE FROM roast_history WHERE rowid NOT IN (SELECT rowid FROM roast_history ORDER BY shown_at DESC, rowid DESC LIMIT 50)');
}

/* ---------- danger zone ---------- */
export async function deleteAllData(): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const t of ['transactions', 'categories', 'payee_memory', 'classifier_tokens', 'classifier_meta', 'level_alerts', 'savings_events', 'roast_history']) {
      await db.runAsync(`DELETE FROM ${t}`);
    }
    await db.runAsync("DELETE FROM sqlite_sequence WHERE name IN ('categories','transactions','savings_events')");
    await db.runAsync("UPDATE settings SET income = 0, salary_day = 1, roast_language = 'mix', onboarding_done = 0 WHERE id = 1");
  });
}

/* ---------- payee memory + classifier ---------- */
export async function getPayeeMemory(norm: string): Promise<number | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ category_id: number }>('SELECT category_id FROM payee_memory WHERE payee_normalized = ?', [norm]);
  return r?.category_id ?? null;
}
export async function rememberPayee(norm: string, categoryId: number): Promise<void> {
  if (!norm) return;
  const db = await getDb();
  const cur = await db.getFirstAsync<{ category_id: number; count: number }>('SELECT * FROM payee_memory WHERE payee_normalized = ?', [norm]);
  if (cur && cur.category_id === categoryId) await db.runAsync('UPDATE payee_memory SET count = count + 1 WHERE payee_normalized = ?', [norm]);
  else await db.runAsync('INSERT OR REPLACE INTO payee_memory (payee_normalized, category_id, count) VALUES (?,?,1)', [norm, categoryId]);
}
export async function loadClassifier(): Promise<NbModel> {
  const db = await getDb();
  const m = newModel();
  const rows = await db.getAllAsync<{ token: string; category_id: number; count: number }>('SELECT * FROM classifier_tokens');
  for (const r of rows) {
    let tc = m.tokenCounts.get(r.category_id);
    if (!tc) m.tokenCounts.set(r.category_id, (tc = new Map()));
    tc.set(r.token, r.count);
    m.tokenTotals.set(r.category_id, (m.tokenTotals.get(r.category_id) ?? 0) + r.count);
    m.vocab.add(r.token);
  }
  const metas = await db.getAllAsync<{ key: string; value: string }>("SELECT * FROM classifier_meta WHERE key LIKE 'docs:%'");
  for (const x of metas) m.docCounts.set(Number(x.key.slice(5)), Number(x.value));
  return m;
}
export async function trainClassifierDb(text: string, categoryId: number): Promise<void> {
  const toks = tokenize(text);
  if (!toks.length) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const t of toks) {
      await db.runAsync(
        'INSERT INTO classifier_tokens (token, category_id, count) VALUES (?,?,1) ON CONFLICT(token, category_id) DO UPDATE SET count = count + 1',
        [t, categoryId],
      );
    }
    await db.runAsync(
      "INSERT INTO classifier_meta (key, value) VALUES (?, '1') ON CONFLICT(key) DO UPDATE SET value = CAST(value AS INTEGER) + 1",
      [`docs:${categoryId}`],
    );
  });
}

/* ---------- pending payments, SMS ---------- */
export async function pendingTransactions(sinceMs: number): Promise<Transaction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TxRow>("SELECT * FROM transactions WHERE status = 'pending' AND created_at >= ? ORDER BY created_at DESC", [sinceMs]);
  return rows.map(toTx);
}
export async function setTransactionStatus(id: number, status: Transaction['status']): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE transactions SET status = ? WHERE id = ?', [status, id]);
}
export async function confirmPendingWithSms(id: number, smsHash: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE transactions SET status = 'confirmed', sms_hash = ? WHERE id = ?", [smsHash, id]);
}
export async function smsHashExists(hash: string): Promise<boolean> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM transactions WHERE sms_hash = ?', [hash]);
  return (r?.c ?? 0) > 0;
}

/* ---------- savings ---------- */
export async function addSavingsEvent(amount: number, payee: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO savings_events (amount, payee, created_at) VALUES (?,?,?)', [amount, payee, Date.now()]);
}
export async function savingsTotal(from: number, to: number): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ s: number | null }>('SELECT SUM(amount) AS s FROM savings_events WHERE created_at >= ? AND created_at < ?', [from, to]);
  return r?.s ?? 0;
}

/* ---------- stats for streak + insights ---------- */
export async function transactionsBetween(from: number, to: number): Promise<Transaction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TxRow>("SELECT * FROM transactions WHERE status != 'cancelled' AND created_at >= ? AND created_at < ? ORDER BY created_at", [from, to]);
  return rows.map(toTx);
}
export async function allTransactions(): Promise<Transaction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TxRow>('SELECT * FROM transactions ORDER BY created_at');
  return rows.map(toTx);
}

/* ---------- backup ---------- */
export async function dumpAll(): Promise<import('../backup/backup').BackupData> {
  const db = await getDb();
  const [settings, categories, transactions] = await Promise.all([getSettings(), listCategories(), allTransactions()]);
  const mem = await db.getAllAsync<{ payee_normalized: string; category_id: number; count: number }>('SELECT * FROM payee_memory');
  const sav = await db.getAllAsync<{ id: number; amount: number; payee: string; created_at: number }>('SELECT * FROM savings_events');
  return {
    app: 'broke-meter', version: 1, exportedAt: Date.now(), settings, categories, transactions,
    payeeMemory: mem.map((m) => ({ payee: m.payee_normalized, categoryId: m.category_id, count: m.count })),
    savingsEvents: sav.map((s) => ({ id: s.id, amount: s.amount, payee: s.payee, createdAt: s.created_at })),
  };
}

export async function restoreAll(b: import('../backup/backup').BackupData): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const t of ['transactions', 'categories', 'payee_memory', 'classifier_tokens', 'classifier_meta', 'level_alerts', 'savings_events', 'roast_history']) {
      await db.runAsync(`DELETE FROM ${t}`);
    }
    for (const c of b.categories) {
      await db.runAsync('INSERT INTO categories (id, name, emoji, monthly_limit, sort_order, archived) VALUES (?,?,?,?,?,0)', [c.id, c.name, c.emoji, c.monthlyLimit, c.sortOrder ?? 0]);
    }
    for (const t of b.transactions) {
      await db.runAsync(
        'INSERT INTO transactions (id, amount, category_id, payee, note, source, status, sms_hash, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
        [t.id, t.amount, t.categoryId, t.payee, t.note, t.source, t.status, t.smsHash, t.createdAt],
      );
    }
    for (const m of b.payeeMemory) await db.runAsync('INSERT OR REPLACE INTO payee_memory (payee_normalized, category_id, count) VALUES (?,?,?)', [m.payee, m.categoryId, m.count]);
    for (const s of b.savingsEvents) await db.runAsync('INSERT INTO savings_events (id, amount, payee, created_at) VALUES (?,?,?,?)', [s.id, s.amount, s.payee, s.createdAt]);
    await db.runAsync('UPDATE settings SET income = ?, salary_day = ?, roast_language = ?, onboarding_done = 1 WHERE id = 1', [b.settings.income, b.settings.salaryDay, b.settings.roastLanguage]);
  });
}
