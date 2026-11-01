import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, TextInput, View } from 'react-native';
import { parseAmountToPaise } from '../src/lib/money';
import { useApp } from '../src/state/AppContext';
import { BottomSheet, Chip, PrimaryButton, Text, TextField, colors, fonts } from '../src/ui';

export default function AddExpense() {
  const router = useRouter();
  const { categories, saveExpense } = useApp();
  const [amount, setAmount] = useState('');
  const [catId, setCatId] = useState<number | null>(categories[0]?.id ?? null);
  const [payee, setPayee] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const paise = parseAmountToPaise(amount);
    if (!paise) return Alert.alert('Enter an amount', 'The amount must be more than zero.');
    setBusy(true);
    try {
      const r = await saveExpense({ amount: paise, categoryId: catId, payee, note });
      if (r.newLevel === 'broke' && r.categoryId != null) router.replace(`/category/${r.categoryId}`);
      else router.back();
    } catch {
      setBusy(false);
      Alert.alert('Could not save', 'Something went wrong. Please try again.');
    }
  };

  return (
    <BottomSheet onClose={() => router.back()}>
      <Text variant="title">Add expense</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 4 }}>
        <Text variant="moneyL" style={{ fontSize: 40 }}>₹</Text>
        <TextInput
          value={amount}
          onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          autoFocus
          style={{ fontFamily: fonts.medium, fontSize: 40, color: colors.text, minWidth: 80, textAlign: 'center' }}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {categories.map((c) => (
          <Chip key={c.id} label={`${c.emoji} ${c.name}`} selected={catId === c.id} onPress={() => setCatId(c.id)} />
        ))}
      </ScrollView>
      <TextField placeholder="Payee (e.g. Swiggy)" value={payee} onChangeText={setPayee} />
      <TextField placeholder="Note (optional)" value={note} onChangeText={setNote} />
      <PrimaryButton label="Save" onPress={save} disabled={busy} />
    </BottomSheet>
  );
}
