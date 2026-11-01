import data from './roasts.json';
import { Level } from '../budget/levels';

export type Lang = 'english' | 'tanglish' | 'mix';
export type Group = 'category' | 'beforePay' | 'overall';
export interface RoastLine { id: string; en: string; ta: string }
export interface Roast { id: string; text: string }
export type Vars = Partial<Record<'amount' | 'left' | 'days' | 'category' | 'count' | 'date', string | number>>;

export const HISTORY_SIZE = 5;
const bank = data as unknown as {
  category: Record<Level, RoastLine[]>;
  beforePay: Record<Level, RoastLine[]>;
  overall: Record<Level, RoastLine[]>;
  win: RoastLine[];
  context: Record<'count' | 'weekend' | 'lateNight', RoastLine[]>;
};

export function fill(template: string, vars: Vars): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = (vars as Record<string, string | number | undefined>)[k];
    return v === undefined ? '' : String(v);
  });
}

function pickLine(lines: RoastLine[], history: string[], rng: () => number): RoastLine {
  const recent = new Set(history.slice(-HISTORY_SIZE));
  const pool = lines.filter((l) => !recent.has(l.id));
  const src = pool.length ? pool : lines;
  return src[Math.floor(rng() * src.length) % src.length];
}

function render(line: RoastLine, lang: Lang, vars: Vars, rng: () => number): Roast {
  const useTa = lang === 'tanglish' || (lang === 'mix' && rng() < 0.5);
  return { id: line.id, text: fill(useTa ? line.ta : line.en, vars) };
}

export function pickRoast(
  group: Group | 'win',
  level: Level,
  lang: Lang,
  vars: Vars,
  history: string[] = [],
  rng: () => number = Math.random,
): Roast {
  const lines = group === 'win' ? bank.win : bank[group][level];
  return render(pickLine(lines, history, rng), lang, vars, rng);
}

/** Special context line: repeated orders, late night, weekend. Returns null if none apply. */
export function contextRoast(
  now: Date,
  category: string,
  countToday: number,
  lang: Lang,
  history: string[] = [],
  rng: () => number = Math.random,
): Roast | null {
  const vars: Vars = { category, count: countToday };
  let key: 'count' | 'weekend' | 'lateNight' | null = null;
  const h = now.getHours();
  if (countToday >= 3) key = 'count';
  else if (h >= 0 && h < 5) key = 'lateNight';
  else if (now.getDay() === 0 || now.getDay() === 6) key = 'weekend';
  if (!key) return null;
  return render(pickLine(bank.context[key], history, rng), lang, vars, rng);
}

export const LEVEL_TITLES: Record<Level, string> = {
  chill: 'Chill',
  warning: 'Careful now',
  danger: 'Danger zone',
  broke: 'Officially broke',
};

export const allLines = bank;
