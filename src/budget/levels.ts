export type Level = 'chill' | 'warning' | 'danger' | 'broke';
export const LEVEL_ORDER: Level[] = ['chill', 'warning', 'danger', 'broke'];

/** usage = spent / limit. <0.5 chill, <0.75 warning, <=1 danger, >1 broke */
export function getLevel(spent: number, limit: number): Level {
  if (limit <= 0) return spent > 0 ? 'broke' : 'chill';
  const u = spent / limit;
  if (u < 0.5) return 'chill';
  if (u < 0.75) return 'warning';
  if (u <= 1) return 'danger';
  return 'broke';
}
export const levelRank = (l: Level): number => LEVEL_ORDER.indexOf(l);
export const isEscalation = (from: Level, to: Level): boolean => levelRank(to) > levelRank(from);
export const usageRatio = (spent: number, limit: number): number => (limit > 0 ? spent / limit : spent > 0 ? 2 : 0);
