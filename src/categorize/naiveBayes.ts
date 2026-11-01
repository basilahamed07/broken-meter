/** Multinomial Naive Bayes with Laplace smoothing. Plain TypeScript, no dependencies. */
export interface NbModel {
  tokenCounts: Map<number, Map<string, number>>; // category -> token -> count
  tokenTotals: Map<number, number>; // category -> total tokens
  docCounts: Map<number, number>; // category -> labelled documents
  vocab: Set<string>;
}

export const MIN_CONFIDENCE = 0.7;
export const MIN_DOCS = 3;

export const newModel = (): NbModel => ({ tokenCounts: new Map(), tokenTotals: new Map(), docCounts: new Map(), vocab: new Set() });

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9@ ]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !/^\d+$/.test(t));
}

export function train(m: NbModel, text: string, categoryId: number): void {
  const toks = tokenize(text);
  if (!toks.length) return;
  let tc = m.tokenCounts.get(categoryId);
  if (!tc) m.tokenCounts.set(categoryId, (tc = new Map()));
  for (const t of toks) {
    tc.set(t, (tc.get(t) ?? 0) + 1);
    m.vocab.add(t);
  }
  m.tokenTotals.set(categoryId, (m.tokenTotals.get(categoryId) ?? 0) + toks.length);
  m.docCounts.set(categoryId, (m.docCounts.get(categoryId) ?? 0) + 1);
}

export interface Prediction { categoryId: number; confidence: number; ranked: { categoryId: number; p: number }[] }

/** Posterior probabilities for every trained category, best first. null if untrained or no known tokens. */
export function predict(m: NbModel, text: string): Prediction | null {
  const cats = [...m.docCounts.keys()];
  const toks = tokenize(text).filter((t) => m.vocab.has(t));
  if (!cats.length || !toks.length) return null;
  const totalDocs = [...m.docCounts.values()].reduce((a, b) => a + b, 0);
  const V = m.vocab.size;
  const logs = cats.map((c) => {
    let lp = Math.log((m.docCounts.get(c) ?? 0) / totalDocs);
    const tc = m.tokenCounts.get(c);
    const total = m.tokenTotals.get(c) ?? 0;
    for (const t of toks) lp += Math.log(((tc?.get(t) ?? 0) + 1) / (total + V));
    return lp;
  });
  const max = Math.max(...logs);
  const exps = logs.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  const ranked = cats.map((c, i) => ({ categoryId: c, p: exps[i] / sum })).sort((a, b) => b.p - a.p);
  return { categoryId: ranked[0].categoryId, confidence: ranked[0].p, ranked };
}

/** Confident enough to use without asking? */
export function confidentPrediction(m: NbModel, text: string): Prediction | null {
  const docs = [...m.docCounts.values()].reduce((a, b) => a + b, 0);
  if (docs < MIN_DOCS) return null;
  const p = predict(m, text);
  return p && p.confidence > MIN_CONFIDENCE ? p : null;
}
