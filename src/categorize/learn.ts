import { rememberPayee, trainClassifierDb } from '../db/queries';
import { normalizePayee } from './memory';

/** Called every time the user (or a tap on a notification) labels a transaction. */
export async function learnLabel(payee: string, note: string, categoryId: number | null): Promise<void> {
  if (categoryId == null) return;
  const norm = normalizePayee(payee);
  if (norm) await rememberPayee(norm, categoryId);
  await trainClassifierDb(`${payee} ${note}`.trim(), categoryId);
}
