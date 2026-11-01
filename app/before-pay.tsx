import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { getLevel } from '../src/budget/levels';
import { addSavingsEvent } from '../src/db/queries';
import { formatRupees } from '../src/lib/money';
import { pickRoast } from '../src/roast/engine';
import { useApp } from '../src/state/AppContext';
import { launchUpi, openGpay } from '../src/upi/launch';
import { Card, CategoryPicker, LevelCard, PrimaryButton, Screen, SecondaryButton, Text, colors, hapticLight } from '../src/ui';

export default function BeforePay() {
  const p = useLocalSearchParams<{ payee: string; amount: string; categoryId: string; upi?: string; note?: string; source: 'qr' | 'p2p' }>();
  const router = useRouter();
  const { categories, spentBy, forecast, cycle, settings, addPending } = useApp();
  const amount = Number(p.amount);
  const [catId, setCatId] = useState(Number(p.categoryId));
  const [busy, setBusy] = useState(false);
  const cat = categories.find((c) => c.id === catId);

  const after = useMemo(() => {
    const catAfter = (spentBy.get(catId) ?? 0) + amount;
    const level = cat ? getLevel(catAfter, cat.monthlyLimit) : 'chill';
    const left = forecast.remaining - amount;
    const days = cycle.daysLeft;
    const lvl = left <= 0 ? 'broke' : level;
    const line = pickRoast('beforePay', lvl, settings.roastLanguage, {
      amount: formatRupees(amount),
      left: formatRupees(Math.max(0, left)),
      days,
      category: cat?.name ?? '',
    }).text;
    return { level: lvl, line };
  // the roast line is picked once per category/amount, not on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catId, amount, settings.roastLanguage]);

  useEffect(() => { hapticLight(after.level); }, [after.level]);

  const payAnyway = async () => {
    setBusy(true);
    try {
      await addPending({ amount, categoryId: catId, payee: p.payee ?? '', note: p.note ?? '', source: p.source });
      if (p.source === 'qr' && p.upi) {
        const how = await launchUpi(p.upi);
        if (how === 'failed') Alert.alert('No UPI app found', 'Install GPay or another UPI app. The payment is saved as pending.');
      } else {
        const ok = await openGpay();
        if (!ok) Alert.alert('Could not open GPay', 'Open it yourself and make the payment. It is saved as pending.');
      }
      router.dismissAll();
    } catch {
      setBusy(false);
      Alert.alert('Something went wrong', 'Please try again.');
    }
  };

  const cancel = async () => {
    await addSavingsEvent(amount, p.payee ?? '');
    router.replace({ pathname: '/win', params: { amount: String(amount), payee: p.payee ?? '' } });
  };

  return (
    <Screen>
      <Card style={{ gap: 12 }}>
        <Text variant="title">Before you pay</Text>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text variant="body" style={{ color: colors.textSecondary }}>Paying {p.payee}</Text>
          <Text variant="moneyL" style={{ fontSize: 40, lineHeight: 48 }}>{formatRupees(amount)}</Text>
        </View>
        <CategoryPicker categories={categories} value={catId} onChange={setCatId} />
        <LevelCard level={after.level} title="" line={after.line} />
        <PrimaryButton label="Pay anyway in GPay" onPress={payAnyway} disabled={busy} />
        <SecondaryButton label={`Cancel and save ${formatRupees(amount)}`} onPress={cancel} />
      </Card>
    </Screen>
  );
}
