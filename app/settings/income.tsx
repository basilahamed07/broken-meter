import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { parseAmountToPaise } from '../../src/lib/money';
import { useApp } from '../../src/state/AppContext';
import { PrimaryButton, Screen, Text, TextField, colors } from '../../src/ui';

export default function IncomeSettings() {
  const router = useRouter();
  const { settings, updateSettings } = useApp();
  const [income, setIncome] = useState(String(settings.income / 100));
  const [day, setDay] = useState(String(settings.salaryDay));

  const save = async () => {
    const paise = parseAmountToPaise(income);
    const d = parseInt(day, 10);
    if (!paise) return Alert.alert('Add your income', 'Enter your monthly income.');
    if (!(d >= 1 && d <= 31)) return Alert.alert('Salary day', 'Pick a day between 1 and 31.');
    await updateSettings({ income: paise, salaryDay: d });
    router.back();
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Text style={{ fontSize: 26, color: colors.textSecondary }}>‹</Text></Pressable>
        <Text variant="title">Income and salary day</Text>
      </View>
      <Text variant="caption">Monthly income (₹)</Text>
      <TextField value={income} onChangeText={(t) => setIncome(t.replace(/[^0-9.]/g, ''))} keyboardType="numeric" />
      <Text variant="caption">Salary day (1–31)</Text>
      <TextField value={day} onChangeText={(t) => setDay(t.replace(/[^0-9]/g, '').slice(0, 2))} keyboardType="numeric" />
      <PrimaryButton label="Save" onPress={save} />
    </Screen>
  );
}
