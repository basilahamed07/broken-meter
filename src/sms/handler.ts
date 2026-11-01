import { matchPending } from '../budget/pending';
import { autoCategorize } from '../categorize/auto';
import { learnLabel } from '../categorize/learn';
import * as q from '../db/queries';
import { formatRupees } from '../lib/money';
import { notifyAskCategory, notifyLevel } from '../notify/alerts';
import { pickRoast } from '../roast/engine';
import { getLevel } from '../budget/levels';
import { getCycle } from '../budget/cycle';
import { checkLevels } from '../state/alerts';
import { addDays } from '../lib/dates';
import { parseDebitSms } from './parser';

export type SmsOutcome = 'ignored' | 'duplicate' | 'matched' | 'saved' | 'asked';

/**
 * Handle one SMS: ignore non-debits, de-duplicate by hash, match a pending in-app payment
 * (same amount, ±10 min), otherwise categorise + save + roast. If unsure, ask via notification.
 * `notify: false` is used when importing past SMS so the phone is not spammed.
 */
export async function processSms(msg: { address: string; body: string; date: number }, opts: { notify: boolean } = { notify: true }): Promise<SmsOutcome> {
  const parsed = parseDebitSms(msg.body, msg.address);
  if (!parsed) return 'ignored';
  if (await q.smsHashExists(parsed.hash)) return 'duplicate';

  const pending = await q.pendingTransactions(msg.date - 24 * 3600_000);
  const hit = matchPending(pending, parsed.amount, msg.date);
  if (hit) {
    await q.confirmPendingWithSms(hit.id, parsed.hash);
    await learnLabel(hit.payee, hit.note, hit.categoryId);
    if (opts.notify) await checkLevels(hit.categoryId);
    return 'matched';
  }

  const r = await autoCategorize(parsed.payee);
  let id: number;
  try {
    id = await q.addTransaction({ amount: parsed.amount, categoryId: r.categoryId, payee: parsed.payee, note: '', source: 'sms', status: 'confirmed', smsHash: parsed.hash, createdAt: msg.date });
  } catch {
    return 'duplicate'; // unique sms_hash race
  }
  if (!opts.notify) return r.categoryId == null ? 'asked' : 'saved';

  if (r.categoryId == null) {
    const options = r.top3.map((cid) => ({ id: cid, label: (r.names.get(cid) ?? '').slice(0, 24) })).filter((o) => o.label);
    await notifyAskCategory(id, `${formatRupees(parsed.amount)}${parsed.payee ? ` to ${parsed.payee}` : ''}, which category?`, options);
    await checkLevels(null);
    return 'asked';
  }

  const res = await checkLevels(r.categoryId);
  if (!res.newLevel) {
    // no level crossing: still tell the user what was tracked, with a roast for the current level
    const s = await q.getSettings();
    const cats = await q.listCategories();
    const cat = cats.find((c) => c.id === r.categoryId);
    if (cat) {
      const cycle = getCycle(new Date(), s.salaryDay);
      const spent = await q.spentByCategory(cycle.start.getTime(), addDays(cycle.end, 1).getTime());
      const level = getLevel(spent.get(cat.id) ?? 0, cat.monthlyLimit);
      const line = pickRoast('category', level, s.roastLanguage, {
        category: cat.name,
        amount: formatRupees(Math.max(0, (spent.get(cat.id) ?? 0) - cat.monthlyLimit)),
        left: formatRupees(Math.max(0, cat.monthlyLimit - (spent.get(cat.id) ?? 0))),
      }, await q.recentRoastIds()).text;
      await notifyLevel(`${cat.emoji} ${formatRupees(parsed.amount)} ${parsed.payee ? `to ${parsed.payee}` : 'spent'}`, line);
    }
  }
  return 'saved';
}

/** User tapped a category button on the "which category?" notification. */
export async function categorizeFromNotification(txId: number, categoryId: number): Promise<void> {
  const t = await q.getTransaction(txId);
  if (!t) return;
  await q.updateTransaction(txId, { amount: t.amount, categoryId, payee: t.payee, note: t.note });
  await learnLabel(t.payee, t.note, categoryId);
  await checkLevels(categoryId);
}
