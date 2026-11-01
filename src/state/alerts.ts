import { getCycle } from '../budget/cycle';
import { computeForecast } from '../budget/forecast';
import { Level, getLevel, isEscalation } from '../budget/levels';
import * as q from '../db/queries';
import { addDays } from '../lib/dates';
import { formatRupees } from '../lib/money';
import { hapticForLevel, notifyLevel } from '../notify/alerts';
import { LEVEL_TITLES, contextRoast, pickRoast } from '../roast/engine';

export interface SaveResult { newLevel: Level | null; categoryId: number | null; roast: string | null }

/**
 * Call after any new spend is recorded (manual, QR, SMS). Fires a notification, haptic and roast
 * once per level crossing per category per cycle (and for the overall budget). Safe to call from
 * anywhere because it reads everything from the database.
 */
export async function checkLevels(categoryId: number | null): Promise<SaveResult> {
  const s = await q.getSettings();
  const today = new Date();
  const cycle = getCycle(today, s.salaryDay);
  const from = cycle.start.getTime();
  const to = addDays(cycle.end, 1).getTime();
  const spent = await q.spentByCategory(from, to);
  const cats = await q.listCategories();
  const cat = cats.find((c) => c.id === categoryId) ?? null;
  let newLevel: Level | null = null;
  let roastText: string | null = null;

  if (cat) {
    const catSpent = spent.get(cat.id) ?? 0;
    const level = getLevel(catSpent, cat.monthlyLimit);
    const scope = `cat:${cat.id}`;
    const prev = (await q.getAlertLevel(scope, from)) as Level | null;
    if (level !== 'chill' && (!prev || isEscalation(prev, level))) {
      await q.setAlertLevel(scope, from, level);
      const history = await q.recentRoastIds();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const cnt = await q.countToday(cat.id, todayStart);
      const ctx = contextRoast(today, cat.name, cnt, s.roastLanguage, history);
      const base = pickRoast('category', level, s.roastLanguage, {
        category: cat.name,
        amount: formatRupees(Math.max(0, catSpent - cat.monthlyLimit)),
        left: formatRupees(Math.max(0, cat.monthlyLimit - catSpent)),
      }, history);
      const pick = level === 'broke' || !ctx ? base : ctx;
      await q.addRoastHistory(pick.id);
      roastText = pick.text;
      newLevel = level;
      await hapticForLevel(level);
      await notifyLevel(`${cat.emoji} ${cat.name}: ${LEVEL_TITLES[level]}`, pick.text);
    }
  }

  let total = 0;
  spent.forEach((v) => (total += v));
  const overall = getLevel(total, s.income);
  const prevAll = (await q.getAlertLevel('overall', from)) as Level | null;
  if (s.income > 0 && overall !== 'chill' && (!prevAll || isEscalation(prevAll, overall))) {
    await q.setAlertLevel('overall', from, overall);
    if (!newLevel || overall === 'broke' || overall === 'danger') {
      const history = await q.recentRoastIds();
      const f = computeForecast(s.income, total, cycle, today);
      const line = pickRoast('overall', overall, s.roastLanguage, {
        amount: formatRupees(Math.max(0, total - s.income)),
        left: formatRupees(Math.max(0, f.remaining)),
        days: cycle.daysLeft,
      }, history);
      await q.addRoastHistory(line.id);
      await notifyLevel(`Overall budget: ${LEVEL_TITLES[overall]}`, line.text);
      if (!newLevel) await hapticForLevel(overall);
    }
  }
  return { newLevel, categoryId, roast: roastText };
}
