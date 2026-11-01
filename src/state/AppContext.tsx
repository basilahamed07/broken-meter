import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Cycle, getCycle } from '../budget/cycle';
import { Forecast, computeForecast } from '../budget/forecast';
import { Level, getLevel, isEscalation } from '../budget/levels';
import * as q from '../db/queries';
import type { Category, Settings, Transaction } from '../db/types';
import { addDays } from '../lib/dates';
import { formatRupees } from '../lib/money';
import { hapticForLevel, notifyLevel } from '../notify/alerts';
import { LEVEL_TITLES, contextRoast, pickRoast } from '../roast/engine';

interface Derived {
  cycle: Cycle;
  forecast: Forecast;
  spentTotal: number;
  spentBy: Map<number | null, number>;
  overallLevel: Level;
}

export interface SaveResult { newLevel: Level | null; categoryId: number | null; roast: string | null }

interface Ctx extends Derived {
  ready: boolean;
  settings: Settings;
  categories: Category[];
  recent: Transaction[];
  refresh: () => Promise<void>;
  updateSettings: (p: Partial<Settings>) => Promise<void>;
  completeOnboarding: (income: number, salaryDay: number, cats: { name: string; emoji: string; monthlyLimit: number }[]) => Promise<void>;
  saveExpense: (t: { amount: number; categoryId: number | null; payee: string; note: string }) => Promise<SaveResult>;
  cycleRange: () => { from: number; to: number };
}

const DEFAULT_SETTINGS: Settings = { income: 0, salaryDay: 1, roastLanguage: 'mix', onboardingDone: false };
const AppCtx = createContext<Ctx | null>(null);
export const useApp = (): Ctx => {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside provider');
  return c;
};

function rangeFor(cycle: Cycle) {
  return { from: cycle.start.getTime(), to: addDays(cycle.end, 1).getTime() };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [spentBy, setSpentBy] = useState<Map<number | null, number>>(new Map());
  const [now, setNow] = useState(() => new Date());
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const refresh = useCallback(async () => {
    const s = await q.getSettings();
    const today = new Date();
    const cycle = getCycle(today, s.salaryDay);
    const { from, to } = rangeFor(cycle);
    const [cats, rec, spent] = await Promise.all([q.listCategories(), q.recentTransactions(10), q.spentByCategory(from, to)]);
    setSettings(s);
    setCategories(cats);
    setRecent(rec);
    setSpentBy(spent);
    setNow(today);
    setReady(true);
  }, []);

  useEffect(() => {
    refresh().catch(() => setReady(true));
  }, [refresh]);

  const derived = useMemo<Derived>(() => {
    const cycle = getCycle(now, settings.salaryDay);
    let spentTotal = 0;
    spentBy.forEach((v) => (spentTotal += v));
    const forecast = computeForecast(settings.income, spentTotal, cycle, now);
    const overallLevel = getLevel(spentTotal, settings.income);
    return { cycle, forecast, spentTotal, spentBy, overallLevel };
  }, [now, settings, spentBy]);

  const updateSettings = useCallback(async (p: Partial<Settings>) => {
    await q.saveSettings(p);
    await refresh();
  }, [refresh]);

  const completeOnboarding: Ctx['completeOnboarding'] = useCallback(async (income, salaryDay, cats) => {
    const existing = await q.listCategories();
    for (const c of existing) await q.deleteCategory(c.id, null);
    for (const c of cats) await q.addCategory(c);
    await q.saveSettings({ income, salaryDay, onboardingDone: true });
    await refresh();
  }, [refresh]);

  /** Saves an expense, then fires a roast notification once per level crossing per cycle. */
  const saveExpense: Ctx['saveExpense'] = useCallback(async (t) => {
    await q.addTransaction({ ...t, source: 'manual', status: 'confirmed' });
    const s = settingsRef.current;
    const today = new Date();
    const cycle = getCycle(today, s.salaryDay);
    const { from, to } = rangeFor(cycle);
    const spent = await q.spentByCategory(from, to);
    const cats = await q.listCategories();
    const cat = cats.find((c) => c.id === t.categoryId) ?? null;
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

    // overall budget
    let total = 0;
    spent.forEach((v) => (total += v));
    const overall = getLevel(total, s.income);
    const prevAll = (await q.getAlertLevel('overall', from)) as Level | null;
    if (overall !== 'chill' && (!prevAll || isEscalation(prevAll, overall)) && s.income > 0) {
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

    await refresh();
    return { newLevel, categoryId: t.categoryId, roast: roastText };
  }, [refresh]);

  const cycleRange = useCallback(() => rangeFor(derived.cycle), [derived.cycle]);

  const value: Ctx = { ...derived, ready, settings, categories, recent, refresh, updateSettings, completeOnboarding, saveExpense, cycleRange };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
