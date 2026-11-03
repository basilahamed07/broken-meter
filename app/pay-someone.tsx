import * as Contacts from 'expo-contacts';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { autoCategorize } from '../src/categorize/auto';
import { parseAmountToPaise } from '../src/lib/money';
import { useApp } from '../src/state/AppContext';
import { isValidVpa } from '../src/upi/qrParser';
import { CategoryPicker, PrimaryButton, Screen, SecondaryButton, Text, TextField, colors } from '../src/ui';

export default function PaySomeone() {
  const router = useRouter();
  const { categories } = useApp();
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [catId, setCatId] = useState<number | null>(null);
  const [suggested, setSuggested] = useState<number[]>([]);

  const suggest = async (name: string) => {
    if (!name.trim()) return;
    const r = await autoCategorize(name);
    if (r.categoryId != null) setCatId(r.categoryId);
    setSuggested(r.top3);
  };

  const pickContact = async () => {
    try {
      const c = await Contacts.presentContactPickerAsync();
      if (c) {
        const name = c.name || [c.firstName, c.lastName].filter(Boolean).join(' ');
        setPayee(name);
        suggest(name);
      }
    } catch {
      Alert.alert('Contacts unavailable', 'Type a name or UPI ID instead.');
    }
  };

  const next = () => {
    const paise = parseAmountToPaise(amount);
    if (!payee.trim()) return Alert.alert('Who are you paying?', 'Pick a contact or type a name or UPI ID.');
    if (!paise) return Alert.alert('Enter the amount', 'The amount must be more than zero.');
    if (catId == null) return Alert.alert('Pick a category', 'Which category is this payment?');
    router.push({ pathname: '/before-pay', params: { payee: payee.trim(), amount: String(paise), categoryId: String(catId), ...(isValidVpa(payee) ? { pa: payee.trim() } : {}), source: 'p2p' } });
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Text style={{ fontSize: 26, color: colors.textSecondary }}>‹</Text></Pressable>
        <Text variant="title">Pay someone</Text>
      </View>
      <Text variant="caption">Who</Text>
      <TextField value={payee} onChangeText={setPayee} onEndEditing={() => suggest(payee)} placeholder="Name or UPI ID (arun@okhdfcbank)" autoCapitalize="none" />
      <SecondaryButton label="Pick a contact" onPress={pickContact} />
      <Text variant="caption">Amount (₹)</Text>
      <TextField value={amount} onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0" style={{ fontSize: 28 }} />
      <Text variant="caption">Category</Text>
      <CategoryPicker categories={categories} value={catId} onChange={setCatId} suggested={suggested} />
      <Text variant="caption">GPay opens normally. You enter the amount there, because GPay often blocks prefilled person-to-person amounts.</Text>
      <PrimaryButton label="Continue" onPress={next} />
    </Screen>
  );
}
