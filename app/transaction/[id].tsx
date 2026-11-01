import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { deleteTransaction, getTransaction, updateTransaction } from '../../src/db/queries';
import { parseAmountToPaise } from '../../src/lib/money';
import { useApp } from '../../src/state/AppContext';
import { Chip, PrimaryButton, Screen, SecondaryButton, Text, TextField, colors } from '../../src/ui';

export default function EditTransaction() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { categories, refresh } = useApp();
  const [loaded, setLoaded] = useState(false);
  const [amount, setAmount] = useState('');
  const [catId, setCatId] = useState<number | null>(null);
  const [payee, setPayee] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    getTransaction(Number(id)).then((t) => {
      if (t) {
        setAmount(String(t.amount / 100));
        setCatId(t.categoryId);
        setPayee(t.payee);
        setNote(t.note);
      }
      setLoaded(true);
    });
  }, [id]);

  const save = async () => {
    const paise = parseAmountToPaise(amount);
    if (!paise) return Alert.alert('Enter an amount', 'The amount must be more than zero.');
    await updateTransaction(Number(id), { amount: paise, categoryId: catId, payee, note });
    await refresh();
    router.back();
  };
  const remove = () =>
    Alert.alert('Delete this expense?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteTransaction(Number(id)); await refresh(); router.back(); } },
    ]);

  if (!loaded) return <Screen><Text variant="caption">Loading…</Text></Screen>;
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Text style={{ fontSize: 26, color: colors.textSecondary }}>‹</Text></Pressable>
        <Text variant="title">Edit expense</Text>
      </View>
      <Text variant="caption">Amount (₹)</Text>
      <TextField value={amount} onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
      <Text variant="caption">Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {categories.map((c) => <Chip key={c.id} label={`${c.emoji} ${c.name}`} selected={catId === c.id} onPress={() => setCatId(c.id)} />)}
      </ScrollView>
      <TextField placeholder="Payee" value={payee} onChangeText={setPayee} />
      <TextField placeholder="Note" value={note} onChangeText={setNote} />
      <PrimaryButton label="Save" onPress={save} />
      <SecondaryButton label="Delete expense" onPress={remove} />
    </Screen>
  );
}
