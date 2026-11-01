import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { getCycle } from '../src/budget/cycle';
import { allTransactions } from '../src/db/queries';
import type { Transaction } from '../src/db/types';
import { biggestDay, compareCycles, formatPct, spendPerCategory, topPayees } from '../src/insights/stats';
import { insightsTip } from '../src/insights/tips';
import { addDays } from '../src/lib/dates';
import { formatRupees } from '../src/lib/money';
import { useApp } from '../src/state/AppContext';
import { Card, ProgressBar, Screen, Text, TipCard, colors, levelColors } from '../src/ui';

export default function Insights() {
  const router = useRouter();
  const { categories, cycle, settings, forecast } = useApp();
  const [cur, setCur] = useState<Transaction[]>([]);
  const [prev, setPrev] = useState<Transaction[]>([]);

  useEffect(() => {
    allTransactions().then((all) => {
      const from = cycle.start.getTime();
      const to = addDays(cycle.end, 1).getTime();
      const prevCycle = getCycle(addDays(cycle.start, -1), settings.salaryDay);
      setCur(all.filter((t) => t.status !== 'cancelled' && t.createdAt >= from && t.createdAt < to));
      setPrev(all.filter((t) => t.status !== 'cancelled' && t.createdAt >= prevCycle.start.getTime() && t.createdAt < from));
    });
  }, [cycle, settings.salaryDay]);

  const curBy = spendPerCategory(cur);
  const prevBy = spendPerCategory(prev);
  const cmp = compareCycles(curBy, prevBy);
  const max = Math.max(1, ...categories.map((c) => curBy.get(c.id) ?? 0));
  const day = biggestDay(cur);
  const payees = topPayees(cur, 5);
  const foodCat = categories.find((c) => /food|dining|eat/i.test(c.name));
  const foodTx = foodCat ? cur.filter((t) => t.categoryId === foodCat.id) : [];
  const tip = insightsTip({
    foodOrderCount: foodTx.length,
    avgFoodOrder: foodTx.length ? Math.round(foodTx.reduce((s, t) => s + t.amount, 0) / foodTx.length) : 0,
    topPayee: payees[0] ? { name: payees[0].payee, count: payees[0].count } : null,
    remaining: forecast.remaining,
    daysLeft: cycle.daysLeft,
  });

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Text style={{ fontSize: 26, color: colors.textSecondary }}>‹</Text></Pressable>
        <Text variant="title">Insights</Text>
      </View>

      <Card style={{ gap: 12 }}>
        <Text variant="heading">Spend per category</Text>
        {categories.map((c) => {
          const v = curBy.get(c.id) ?? 0;
          const pct = cmp.get(c.id);
          return (
            <View key={c.id} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="body">{c.emoji}  {c.name}</Text>
                <Text variant="body">
                  {formatRupees(v)}
                  {pct != null ? <Text variant="caption" style={{ color: pct > 0 ? levelColors.broke.text : levelColors.chill.text }}>   {c.name} {formatPct(pct)}</Text> : null}
                </Text>
              </View>
              <ProgressBar ratio={v / max} color={levelColors.warning.bar} />
            </View>
          );
        })}
      </Card>

      <Card inner style={{ gap: 4 }}>
        <Text variant="caption">Biggest spending day</Text>
        <Text variant="heading">{day ? `${day.date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })} · ${formatRupees(day.amount)}` : 'No spending yet'}</Text>
      </Card>

      <Card style={{ gap: 8 }}>
        <Text variant="heading">Top payees</Text>
        {payees.length === 0 ? <Text variant="caption">Add payees to your expenses to see this.</Text> : null}
        {payees.map((p, i) => (
          <View key={p.payee} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="body">{i + 1}. {p.payee} <Text variant="caption">×{p.count}</Text></Text>
            <Text variant="body">{formatRupees(p.amount)}</Text>
          </View>
        ))}
      </Card>

      <TipCard text={tip} />
    </Screen>
  );
}
