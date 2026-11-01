import rules from './rules.json';
import type { Category } from '../db/types';
import { NbModel, confidentPrediction, predict } from './naiveBayes';
import { normalizePayee } from './memory';

export type CategorizeSource = 'memory' | 'rules' | 'learner';
export interface CategorizeResult {
  categoryId: number | null;
  source: CategorizeSource | null;
  /** top 3 suggestions for "which category?" prompts */
  top3: number[];
}

type RuleSet = Record<string, { categoryHints: string[]; keywords: string[] }>;
const RULES = rules as RuleSet;

function keywordHit(haystack: string, kw: string): boolean {
  if (kw.length <= 3) return haystack.split(' ').includes(kw); // short keywords (ola, eb, vi) must be whole words
  return haystack.includes(kw);
}

/** Step 2: keyword rules, mapped to the user's closest-named category. Skipped if no category matches. */
export function ruleCategory(text: string, categories: Pick<Category, 'id' | 'name'>[]): number | null {
  const h = text.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  for (const group of Object.values(RULES)) {
    if (!group.keywords.some((k) => keywordHit(h, k))) continue;
    const cat = categories.find((c) => group.categoryHints.some((hint) => c.name.toLowerCase().includes(hint)));
    if (cat) return cat.id;
  }
  return null;
}

export interface PipelineCtx {
  categories: Pick<Category, 'id' | 'name'>[];
  /** exact payee memory lookup: normalized payee -> category id */
  memory: (normalizedPayee: string) => number | null;
  model: NbModel;
}

export function categorize(input: { payee: string; note?: string }, ctx: PipelineCtx): CategorizeResult {
  const valid = new Set(ctx.categories.map((c) => c.id));
  const text = `${input.payee} ${input.note ?? ''}`.trim();
  const fallbackTop = ctx.categories.slice(0, 3).map((c) => c.id);
  const topFrom = (): number[] => {
    const p = predict(ctx.model, text);
    const ids = (p?.ranked ?? []).map((r) => r.categoryId).filter((id) => valid.has(id));
    for (const id of fallbackTop) if (!ids.includes(id)) ids.push(id);
    return ids.slice(0, 3);
  };

  // 1. exact memory
  const norm = normalizePayee(input.payee);
  if (norm) {
    const m = ctx.memory(norm);
    if (m != null && valid.has(m)) return { categoryId: m, source: 'memory', top3: topFrom() };
  }
  // 2. keyword rules
  const r = ruleCategory(text, ctx.categories);
  if (r != null) return { categoryId: r, source: 'rules', top3: topFrom() };
  // 3. tiny learner (only when confident)
  const p = confidentPrediction(ctx.model, text);
  if (p && valid.has(p.categoryId)) return { categoryId: p.categoryId, source: 'learner', top3: topFrom() };
  // 4. ask once
  return { categoryId: null, source: null, top3: topFrom() };
}
