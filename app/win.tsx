import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { savingsTotal } from '../src/db/queries';
import { formatRupees } from '../src/lib/money';
import { pickRoast } from '../src/roast/engine';
import { useApp } from '../src/state/AppContext';
import { loadStreak } from '../src/state/streak';
import { LevelCard, PrimaryButton, Screen, SecondaryButton, StatCard, Text, colors, levelColors, shareView } from '../src/ui';

export default function Win() {
  const { amount } = useLocalSearchParams<{ amount: string; payee?: string }>();
  const router = useRouter();
  const { settings, cycleRange } = useApp();
  const [saved, setSaved] = useState(0);
  const [streak, setStreak] = useState(0);
  const card = useRef<any>(null);
  const amt = Number(amount);

  useEffect(() => {
    const { from, to } = cycleRange();
    savingsTotal(from, to).then(setSaved).catch(() => {});
    loadStreak().then(setStreak).catch(() => {});
  }, [cycleRange]);

  const line = useMemo(() => pickRoast('win', 'chill', settings.roastLanguage, { amount: formatRupees(amt) }).text, [amt, settings.roastLanguage]);
  const lc = levelColors.chill;

  return (
    <Screen>
      <Text variant="title">Nice save</Text>
      <View ref={card} collapsable={false} style={{ backgroundColor: colors.page }}>
        <LevelCard emoji="😎" bg={lc.bg} color={lc.text} title={`Cancelled ${formatRupees(amt)}`} line={line} subline={`Savings streak: ${streak} day${streak === 1 ? '' : 's'} 🔥`} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <StatCard label="Saved" value={formatRupees(saved)} />
        <StatCard label="Streak" value={`${streak} day${streak === 1 ? '' : 's'}`} />
      </View>
      <SecondaryButton label="Share my win" onPress={() => shareView(card)} />
      <PrimaryButton label="Done" onPress={() => router.dismissAll()} />
    </Screen>
  );
}
