import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Cycle, getCycle } from '../budget/cycle';
import { Forecast, computeForecast } from '../budget/forecast';
import { Level, getLevel } from '../budget/levels';
import * as q from '../db/queries';
import type { Category, Settings, Transaction } from '../db/types';
import { addDays } from '../lib/dates';
import { AppState } from 'react-native';
import { learnLabel } from '../categorize/learn';
import { startSmsListener } from '../sms/listener';
import { SaveResult, checkLevels } from './alerts';

interface Derived {
  cycle: Cycle;
  forecast: Forecast;
  spentTotal: number;
  spentBy: Map<number | null, number>;
  overallLevel: Level;
}

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
  /** Record an in-app payment that has been handed to GPay. Confirmed later by SMS or by asking the user. */
  addPending: (t: { amount: number; categoryId: number | null; payee: string; note: string; source: 'qr' | 'p2p' }) => Promise<number>;
  pendingPrompt: Transaction | null;
  resolvePending: (id: number, wentThrough: boolean) => Promise<void>;
  snoozePending: () => void;
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

  /** Saves a manual expense, learns from the label, then fires level alerts. */
  const saveExpense: Ctx['saveExpense'] = useCallback(async (t) => {
    await q.addTransaction({ ...t, source: 'manual', status: 'confirmed' });
    await learnLabel(t.payee, t.note, t.categoryId);
    const r = await checkLevels(t.categoryId);
    await refresh();
    return r;
  }, [refresh]);

  useEffect(() => {
    if (!ready || !settings.onboardingDone) return;
    return startSmsListener(() => { refresh().catch(() => {}); });
  }, [ready, settings.onboardingDone, refresh]);

  const [pendingPrompt, setPendingPrompt] = useState<Transaction | null>(null);
  const snoozed = useRef(new Set<number>());

  const checkPending = useCallback(async () => {
    if (!settingsRef.current.onboardingDone) return;
    const list = await q.pendingTransactions(Date.now() - 24 * 3600_000);
    const next = list.find((t) => !snoozed.current.has(t.id) && Date.now() - t.createdAt > 8_000);
    setPendingPrompt(next ?? null);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') refresh().then(checkPending).catch(() => {});
    });
    return () => sub.remove();
  }, [refresh, checkPending]);
  useEffect(() => { if (ready) checkPending().catch(() => {}); }, [ready, checkPending]);

  const addPending: Ctx['addPending'] = useCallback(async (t) => {
    const id = await q.addTransaction({ ...t, status: 'pending' });
    await refresh();
    return id;
  }, [refresh]);

  const resolvePending: Ctx['resolvePending'] = useCallback(async (id, wentThrough) => {
    const t = await q.getTransaction(id);
    if (!t) return;
    if (wentThrough) {
      await q.setTransactionStatus(id, 'confirmed');
      await learnLabel(t.payee, t.note, t.categoryId);
      await checkLevels(t.categoryId);
    } else {
      await q.setTransactionStatus(id, 'cancelled');
    }
    setPendingPrompt(null);
    await refresh();
    await checkPending();
  }, [refresh, checkPending]);

  const snoozePending = useCallback(() => {
    if (pendingPrompt) snoozed.current.add(pendingPrompt.id);
    setPendingPrompt(null);
  }, [pendingPrompt]);

  const cycleRange = useCallback(() => rangeFor(derived.cycle), [derived.cycle]);

  const value: Ctx = { ...derived, ready, settings, categories, recent, refresh, updateSettings, completeOnboarding, saveExpense, cycleRange, addPending, pendingPrompt, resolvePending, snoozePending };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
