import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { autoCategorize } from '../src/categorize/auto';
import { formatRupees, parseAmountToPaise } from '../src/lib/money';
import { useApp } from '../src/state/AppContext';
import { UpiPayment, parseUpiQr, payeeLabel } from '../src/upi/qrParser';
import { CategoryPicker, PrimaryButton, Screen, SecondaryButton, Text, TextField, colors, radius } from '../src/ui';

export default function PayQr() {
  const router = useRouter();
  const { categories } = useApp();
  const [perm, requestPerm] = useCameraPermissions();
  const [pay, setPay] = useState<UpiPayment | null>(null);
  const [amount, setAmount] = useState('');
  const [catId, setCatId] = useState<number | null>(null);
  const [suggested, setSuggested] = useState<number[]>([]);
  const [auto, setAuto] = useState<boolean>(false);
  const [manual, setManual] = useState('');
  const locked = useRef(false);

  const accept = async (data: string) => {
    const p = parseUpiQr(data);
    if (!p) {
      Alert.alert('Not a UPI QR', 'This QR code is not a UPI payment code.', [{ text: 'OK', onPress: () => { locked.current = false; } }]);
      return;
    }
    const r = await autoCategorize(payeeLabel(p), p.tn);
    setPay(p);
    setAmount(p.am ? String(p.am / 100) : '');
    setCatId(r.categoryId);
    setAuto(r.categoryId != null);
    setSuggested(r.top3);
  };

  const onScan = ({ data }: { data: string }) => {
    if (locked.current) return;
    locked.current = true;
    accept(data).catch(() => { locked.current = false; });
  };

  const goBefore = () => {
    const paise = parseAmountToPaise(amount);
    if (!paise) return Alert.alert('Enter the amount', 'This QR has no amount. Type how much you are paying.');
    if (catId == null) return Alert.alert('Pick a category', 'Which category is this payment?');
    router.push({ pathname: '/before-pay', params: { payee: payeeLabel(pay!), amount: String(paise), categoryId: String(catId), upi: pay!.raw, note: pay!.tn, source: 'qr' } });
  };

  const back = (
    <Pressable onPress={() => router.back()} hitSlop={12}><Text style={{ fontSize: 26, color: colors.textSecondary }}>‹</Text></Pressable>
  );

  if (pay) {
    return (
      <Screen>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>{back}<Text variant="title">Paying {payeeLabel(pay)}</Text></View>
        <Text variant="caption">{pay.pa}</Text>
        <Text variant="caption">Amount (₹)</Text>
        <TextField value={amount} onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0" editable={!pay.am} style={{ fontSize: 28 }} />
        <Text variant="caption">{auto ? 'Category (auto-picked, tap to change)' : 'Which category is this?'}</Text>
        <CategoryPicker categories={categories} value={catId} onChange={(id) => { setCatId(id); setAuto(true); }} suggested={suggested} />
        <PrimaryButton label={amount ? `Continue with ${formatRupees(parseAmountToPaise(amount))}` : 'Continue'} onPress={goBefore} />
        <SecondaryButton label="Scan a different QR" onPress={() => { setPay(null); locked.current = false; }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>{back}<Text variant="title">Scan and pay</Text></View>
      {perm?.granted ? (
        <View style={{ height: 340, borderRadius: radius.card, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
          <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScan} />
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Text variant="body" style={{ color: colors.textSecondary }}>
            {perm && !perm.canAskAgain ? 'Camera permission is blocked. You can enable it in the phone settings, or paste the UPI link below.' : 'Camera access is only used to read UPI QR codes. Nothing is stored or sent.'}
          </Text>
          {perm?.canAskAgain !== false && <PrimaryButton label="Allow camera" onPress={() => requestPerm()} />}
        </View>
      )}
      <Text variant="caption" style={{ marginTop: 8 }}>No camera? Paste a upi://pay link</Text>
      <TextField value={manual} onChangeText={setManual} placeholder="upi://pay?pa=shop@upi&pn=Shop" autoCapitalize="none" autoCorrect={false} />
      <SecondaryButton label="Use this link" onPress={() => manual.trim() && onScan({ data: manual })} />
    </Screen>
  );
}
