import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { getLevel, usageRatio } from '../../src/budget/levels';
import { categoryTransactions } from '../../src/db/queries';
import type { Transaction } from '../../src/db/types';
import { categoryTip } from '../../src/insights/tips';
import { formatRupees } from '../../src/lib/money';
import { LEVEL_TITLES, pickRoast } from '../../src/roast/engine';
import { useApp } from '../../src/state/AppContext';
import { Card, LevelCard, ProgressBar, Screen, Text, TipCard, colors, levelColors } from '../../src/ui';

export default function CategoryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { categories, spentBy, cycle, settings, cycleRange, recent } = useApp();
  const cat = categories.find((c) => c.id === Number(id));
  const [txs, setTxs] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!cat) return;
    const { from, to } = cycleRange();
    categoryTransactions(cat.id, from, to).then(setTxs).catch(() => {});
  }, [cat, cycleRange, recent, spentBy]);

  const spent = cat ? spentBy.get(cat.id) ?? 0 : 0;
  const level = cat ? getLevel(spent, cat.monthlyLimit) : 'chill';
  const roast = useMemo(
    () =>
      cat
        ? pickRoast('category', level, settings.roastLanguage, {
            category: cat.name,
            amount: formatRupees(Math.max(0, spent - cat.monthlyLimit)),
            left: formatRupees(Math.max(0, cat.monthlyLimit - spent)),
          }).text
        : '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cat?.id, level, settings.roastLanguage],
  );

  if (!cat) return <Screen><Text>Category not found.</Text></Screen>;

  const payeeCounts = new Map<string, number>();
  txs.forEach((t) => t.payee && payeeCounts.set(t.payee, (payeeCounts.get(t.payee) ?? 0) + 1));
  const top = [...payeeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const tip = categoryTip({
    categoryName: cat.name, level, txCount: txs.length, spent, limit: cat.monthlyLimit, daysLeft: cycle.daysLeft,
    topPayee: top ? { name: top[0], count: top[1] } : null,
  });

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Text style={{ fontSize: 26, color: colors.textSecondary }}>‹</Text></Pressable>
        <Text variant="title">{cat.emoji} {cat.name}</Text>
      </View>

      <LevelCard level={level} title={LEVEL_TITLES[level]} line={roast} />

      <Card inner style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="body">Spent this cycle</Text>
          <Text variant="body">{formatRupees(spent)} / {formatRupees(cat.monthlyLimit)}</Text>
        </View>
        <ProgressBar ratio={usageRatio(spent, cat.monthlyLimit)} color={levelColors[level].bar} />
      </Card>

      <TipCard text={tip} />

      <Text variant="heading" style={{ marginTop: 4 }}>Transactions</Text>
      <Card style={{ paddingVertical: 4 }}>
        {txs.length === 0 ? <Text variant="caption" style={{ paddingVertical: 12 }}>Nothing here this cycle.</Text> : null}
        {txs.map((t, i) => (
          <Pressable key={t.id} onPress={() => router.push(`/transaction/${t.id}`)} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: i === txs.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
            <View style={{ flex: 1 }}>
              <Text variant="body" numberOfLines={1}>{t.payee || 'Expense'}</Text>
              <Text variant="caption">{new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{t.note ? ` · ${t.note}` : ''}</Text>
            </View>
            <Text variant="body">{formatRupees(t.amount)}</Text>
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}
