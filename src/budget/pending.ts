export const MATCH_WINDOW_MS = 10 * 60 * 1000;

export interface PendingLike { id: number; amount: number; createdAt: number; status: string }

/** Find a pending in-app payment with the same amount within ±10 minutes of the SMS time. */
export function matchPending<T extends PendingLike>(pending: T[], amount: number, smsTime: number): T | null {
  let best: T | null = null;
  for (const p of pending) {
    if (p.status !== 'pending' || p.amount !== amount) continue;
    const dt = Math.abs(p.createdAt - smsTime);
    if (dt <= MATCH_WINDOW_MS && (!best || dt < Math.abs(best.createdAt - smsTime))) best = p;
  }
  return best;
}
