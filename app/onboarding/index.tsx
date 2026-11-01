import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { requestNotificationPermission } from '../../src/notify/alerts';
import { formatRupees, parseAmountToPaise, toPaise } from '../../src/lib/money';
import { useApp } from '../../src/state/AppContext';
import { Card, PrimaryButton, Screen, SecondaryButton, Text, TextField, colors, fonts, radius } from '../../src/ui';

interface Row { emoji: string; name: string; limit: string }
const SUGGESTIONS: Row[] = [
  { emoji: '🛒', name: 'Groceries', limit: '4000' },
  { emoji: '🍔', name: 'Food', limit: '2500' },
  { emoji: '🚌', name: 'Travel', limit: '2000' },
  { emoji: '🛍️', name: 'Shopping', limit: '2000' },
  { emoji: '💡', name: 'Bills', limit: '3000' },
  { emoji: '📦', name: 'Others', limit: '1500' },
];

function Dots({ step }: { step: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3].map((n) => (
        <View key={n} style={{ width: n === step ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: n === step ? colors.accentText : colors.track }} />
      ))}
    </View>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const { completeOnboarding } = useApp();
  const [step, setStep] = useState(1);
  const [income, setIncome] = useState('20000');
  const [salaryDay, setSalaryDay] = useState('1');
  const [rows, setRows] = useState<Row[]>(SUGGESTIONS);
  const [notif, setNotif] = useState(false);
  const [busy, setBusy] = useState(false);

  const incomeNum = Number(income.replace(/[^0-9.]/g, '')) || 0;
  const total = rows.reduce((s, r) => s + (Number(r.limit.replace(/[^0-9.]/g, '')) || 0), 0);
  const over = total > incomeNum;
  const setRow = (i: number, p: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...p } : r)));

  const next = () => {
    if (step === 1) {
      const d = parseInt(salaryDay, 10);
      if (!incomeNum) return Alert.alert('Add your income', 'Enter your monthly income to continue.');
      if (!(d >= 1 && d <= 31)) return Alert.alert('Salary day', 'Pick a day between 1 and 31.');
    }
    if (step === 2) {
      const valid = rows.filter((r) => r.name.trim());
      if (!valid.length) return Alert.alert('Add a category', 'You need at least one category.');
    }
    setStep(step + 1);
  };

  const finish = async () => {
    setBusy(true);
    try {
      if (notif) await requestNotificationPermission();
      const cats = rows
        .filter((r) => r.name.trim())
        .map((r) => ({ name: r.name.trim(), emoji: r.emoji.trim() || '📦', monthlyLimit: parseAmountToPaise(r.limit) }));
      await completeOnboarding(toPaise(incomeNum), parseInt(salaryDay, 10), cats);
      router.replace('/');
    } catch {
      setBusy(false);
      Alert.alert('Could not finish setup', 'Please try again.');
    }
  };

  const titles = ['Your income', 'Set your categories', 'Permissions'];

  return (
    <Screen>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="title">{titles[step - 1]}</Text>
          <Text variant="body" style={{ color: colors.textMuted }}>{step}/3</Text>
        </View>
        <Dots step={step} />

        {step === 1 && (
          <>
            <Text variant="caption">Monthly income (₹)</Text>
            <TextField value={income} onChangeText={setIncome} keyboardType="numeric" placeholder="20000" />
            <Text variant="caption">Salary day of the month (1–31)</Text>
            <TextField value={salaryDay} onChangeText={(t) => setSalaryDay(t.replace(/[^0-9]/g, '').slice(0, 2))} keyboardType="numeric" placeholder="1" />
            <Text variant="caption">Your budget cycle runs from salary day to the day before the next one. Day 31 uses the last day of shorter months.</Text>
          </>
        )}

        {step === 2 && (
          <>
            <Text variant="caption">Edit the suggestions or add your own: emoji, name, monthly limit.</Text>
            {rows.map((r, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput value={r.emoji} onChangeText={(t) => setRow(i, { emoji: t })} maxLength={8} style={{ width: 48, textAlign: 'center', fontSize: 20, backgroundColor: colors.surface, borderRadius: radius.inner, paddingVertical: 10, color: colors.text }} />
                <TextField style={{ flex: 1 }} value={r.name} onChangeText={(t) => setRow(i, { name: t })} placeholder="Name" />
                <TextInput value={r.limit} onChangeText={(t) => setRow(i, { limit: t.replace(/[^0-9.]/g, '') })} keyboardType="numeric" placeholder="₹" placeholderTextColor={colors.textMuted} style={{ width: 84, backgroundColor: colors.surface, borderRadius: radius.inner, paddingVertical: 14, paddingHorizontal: 10, color: colors.text, fontFamily: fonts.regular, fontSize: 16, textAlign: 'right' }} />
                <Pressable onPress={() => setRows((rs) => rs.filter((_, j) => j !== i))} hitSlop={8}>
                  <Text style={{ color: colors.textMuted, fontSize: 18 }}>✕</Text>
                </Pressable>
              </View>
            ))}
            <Pressable onPress={() => setRows((rs) => [...rs, { emoji: '📦', name: '', limit: '' }])}>
              <Text variant="body" style={{ color: colors.accentText }}>＋ Add category</Text>
            </Pressable>
            <Text variant="body" style={{ color: over ? colors.warn : colors.success }}>
              Total {formatRupees(toPaise(total))} of {formatRupees(toPaise(incomeNum))}
            </Text>
          </>
        )}

        {step === 3 && (
          <>
            <Text variant="caption">All optional. The app works fully with manual entry. Nothing ever leaves your phone.</Text>
            <Card inner style={{ gap: 4 }}>
              <Text variant="heading">🔔 Notifications</Text>
              <Text variant="caption">Roast alerts when a category crosses a level. Local only.</Text>
              <SecondaryButton label={notif ? 'Will ask on start ✓' : 'Allow notifications'} onPress={() => setNotif(!notif)} style={{ marginTop: 8, paddingVertical: 12 }} />
            </Card>
            <Card inner style={{ gap: 4 }}>
              <Text variant="heading">💬 SMS</Text>
              <Text variant="caption">Lets the app spot bank debit messages automatically. Asked when you turn it on in a later update.</Text>
            </Card>
            <Card inner style={{ gap: 4 }}>
              <Text variant="heading">📷 Camera</Text>
              <Text variant="caption">Only for scanning UPI QR codes. Asked the first time you scan.</Text>
            </Card>
          </>
        )}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {step > 1 && <SecondaryButton label="Back" onPress={() => setStep(step - 1)} style={{ paddingHorizontal: 20 }} />}
          <PrimaryButton label={step === 3 ? 'Start tracking' : 'Next'} onPress={step === 3 ? finish : next} disabled={busy} style={{ flex: 1 }} />
        </View>
      </Card>
    </Screen>
  );
}
