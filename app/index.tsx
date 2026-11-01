import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { forecastLine } from '../src/budget/forecast';
import { formatRupees } from '../src/lib/money';
import { useApp } from '../src/state/AppContext';
import { Card, CategoryRow, PrimaryButton, Screen, SecondaryButton, SummaryCard, Text, colors, levelColors } from '../src/ui';

export default function Home() {
  const router = useRouter();
  const { settings, categories, spentBy, forecast, overallLevel, recent } = useApp();
  if (!settings.onboardingDone) return <Redirect href="/onboarding" />;

  const soon = (what: string) => Alert.alert(what, 'This arrives in the next update (Phase 2). Use "Add expense" for now.');
  const catName = (id: number | null) => categories.find((c) => c.id === id);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
        <Text variant="title">Broke meter</Text>
        <Pressable onPress={() => router.push('/settings')} hitSlop={12} accessibilityLabel="Settings">
          <Text style={{ fontSize: 22, color: colors.textSecondary }}>⚙</Text>
        </Pressable>
      </View>

      <SummaryCard
        label="Left this month"
        value={formatRupees(forecast.remaining)}
        valueColor={forecast.remaining < 0 ? levelColors.broke.text : undefined}
        forecast={forecastLine(forecast)}
        forecastColor={levelColors[overallLevel].text}
      />

      <Card style={{ paddingVertical: 8 }}>
        {categories.map((c) => (
          <CategoryRow key={c.id} emoji={c.emoji} name={c.name} spent={spentBy.get(c.id) ?? 0} limit={c.monthlyLimit} onPress={() => router.push(`/category/${c.id}`)} />
        ))}
        {categories.length === 0 ? <Text variant="caption" style={{ paddingVertical: 12 }}>No categories yet. Add some in Settings.</Text> : null}
      </Card>

      <PrimaryButton label="Scan and pay" onPress={() => soon('Scan and pay')} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <SecondaryButton label="Pay someone" style={{ flex: 1 }} onPress={() => soon('Pay someone')} />
        <SecondaryButton label="Add expense" style={{ flex: 1 }} onPress={() => router.push('/add-expense')} />
      </View>

      <Text variant="heading" style={{ marginTop: 8 }}>Recent</Text>
      <Card style={{ paddingVertical: 4 }}>
        {recent.length === 0 ? <Text variant="caption" style={{ paddingVertical: 12 }}>Nothing yet. Your wallet is suspiciously quiet.</Text> : null}
        {recent.map((t, i) => {
          const c = catName(t.categoryId);
          return (
            <Pressable key={t.id} onPress={() => router.push(`/transaction/${t.id}`)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10, borderBottomWidth: i === recent.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 20 }}>{c?.emoji ?? '🧾'}</Text>
              <View style={{ flex: 1 }}>
                <Text variant="body" numberOfLines={1}>{t.payee || c?.name || 'Expense'}</Text>
                <Text variant="caption">
                  {new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  {t.status === 'pending' ? ' · pending' : ''}
                  {t.note ? ` · ${t.note}` : ''}
                </Text>
              </View>
              <Text variant="body">{formatRupees(t.amount)}</Text>
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}
