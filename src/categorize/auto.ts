import { getPayeeMemory, listCategories, loadClassifier } from '../db/queries';
import { CategorizeResult, categorize } from './pipeline';
import { normalizePayee } from './memory';

/** Full pipeline against the database: memory -> rules -> learner -> ask. */
export async function autoCategorize(payee: string, note = ''): Promise<CategorizeResult & { names: Map<number, string> }> {
  const [categories, model] = await Promise.all([listCategories(), loadClassifier()]);
  const norm = normalizePayee(payee);
  const mem = norm ? await getPayeeMemory(norm) : null;
  const r = categorize({ payee, note }, { categories, memory: (n) => (n === norm ? mem : null), model });
  return { ...r, names: new Map(categories.map((c) => [c.id, `${c.emoji} ${c.name}`])) };
}
