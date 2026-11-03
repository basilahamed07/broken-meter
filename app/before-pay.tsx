import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { getLevel } from '../src/budget/levels';
import { addSavingsEvent } from '../src/db/queries';
import { formatRupees } from '../src/lib/money';
import { pickRoast } from '../src/roast/engine';
import { useApp } from '../src/state/AppContext';
import * as Clipboard from 'expo-clipboard';
import { GPAY_PACKAGE, getUpiApps, launchUpi, openUpiApp } from '../src/upi/launch';
import { Card, CategoryPicker, LevelCard, PrimaryButton, Screen, SecondaryButton, Text, colors, hapticLight } from '../src/ui';

export default function BeforePay() {
  const p = useLocalSearchParams<{ payee: string; amount: string; categoryId: string; upi?: string; pa?: string; note?: string; source: 'qr' | 'p2p' }>();
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

  const apps = useMemo(() => getUpiApps(p.upi ?? 'upi://pay?pa=x@upi'), [p.upi]);
  const hasGpay = apps.some((a) => a.packageName === GPAY_PACKAGE);
  const others = apps.filter((a) => a.packageName !== GPAY_PACKAGE);

  /** Save as pending first, hand over to the UPI app, then close. Does not wait for the UPI app to return. */
  const pay = async (pkg?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await addPending({ amount, categoryId: catId, payee: p.payee ?? '', note: p.note ?? '', source: p.source });
      if (p.source === 'qr' && p.upi) {
        const how = await launchUpi(p.upi, pkg);
        if (how === 'failed') Alert.alert('No UPI app found', 'Install GPay or another UPI app. The payment is saved as pending.');
      } else {
        const ok = openUpiApp(pkg ?? GPAY_PACKAGE);
        if (!ok) Alert.alert('Could not open the UPI app', 'Open it yourself and make the payment. It is saved as pending.');
      }
      router.dismissAll();
    } catch {
      setBusy(false);
      Alert.alert('Something went wrong', 'Please try again.');
    }
  };

  const primary = () => {
    if (p.source === 'p2p' && !hasGpay) {
      Alert.alert('GPay is not installed', others.length ? 'Pick another UPI app below.' : 'Install a UPI app to pay.');
      return;
    }
    return pay(hasGpay ? GPAY_PACKAGE : undefined);
  };

  const copyAndOpen = async () => {
    if (!p.pa) return;
    try {
      await Clipboard.setStringAsync(p.pa);
    } catch {
      // copying is best effort
    }
    openUpiApp(hasGpay ? GPAY_PACKAGE : apps[0]?.packageName ?? GPAY_PACKAGE);
    Alert.alert('UPI ID copied', `UPI ID copied: ${p.pa}. Enter ${formatRupees(amount)} in the app.`);
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
        <PrimaryButton label={hasGpay ? 'Pay anyway in GPay' : 'Pay anyway'} onPress={primary} disabled={busy} />
        {others.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text variant="caption">Other UPI apps</Text>
            {others.map((a) => (
              <SecondaryButton key={a.packageName} label={a.label} onPress={() => pay(a.packageName)} disabled={busy} />
            ))}
          </View>
        )}
        <View style={{ gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
          <Text variant="heading">Payment failed in the UPI app?</Text>
          <Text variant="caption">If it says bank not reachable, UPI ID not available or payment declined, pay inside your UPI app instead.</Text>
          {!!p.pa && <SecondaryButton label="Copy UPI ID and open GPay" onPress={copyAndOpen} />}
        </View>
        <SecondaryButton label={`Cancel and save ${formatRupees(amount)}`} onPress={cancel} />
      </Card>
    </Screen>
  );
}
