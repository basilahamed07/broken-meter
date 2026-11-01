import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { deleteAllData } from '../../src/db/queries';
import { formatRupees } from '../../src/lib/money';
import { useApp } from '../../src/state/AppContext';
import { Card, Screen, SegmentedControl, SettingsRow, Text, colors } from '../../src/ui';

export default function Settings() {
  const router = useRouter();
  const { settings, updateSettings, refresh, categories } = useApp();

  const soon = (what: string) => Alert.alert(what, 'Coming in Phase 4.');
  const wipe = () =>
    Alert.alert('Delete all data?', 'Every expense, category and setting on this phone will be erased.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue', style: 'destructive',
        onPress: () =>
          Alert.alert('Are you absolutely sure?', 'This cannot be undone.', [
            { text: 'Keep my data', style: 'cancel' },
            { text: 'Delete everything', style: 'destructive', onPress: async () => { await deleteAllData(); await refresh(); router.replace('/'); } },
          ]),
      },
    ]);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Text style={{ fontSize: 26, color: colors.textSecondary }}>‹</Text></Pressable>
        <Text variant="title">Settings</Text>
      </View>
      <Card style={{ paddingVertical: 4 }}>
        <SettingsRow label="Income and salary day" value={`${formatRupees(settings.income)} · day ${settings.salaryDay}`} onPress={() => router.push('/settings/income')} />
        <SettingsRow label="Categories" value={`${categories.length}`} onPress={() => router.push('/settings/categories')} />
        <View style={{ paddingVertical: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text variant="body" style={{ fontSize: 16 }}>Roast language</Text>
          <SegmentedControl
            value={settings.roastLanguage}
            onChange={(v) => updateSettings({ roastLanguage: v })}
            options={[{ value: 'english', label: 'English' }, { value: 'tanglish', label: 'Tanglish' }, { value: 'mix', label: 'Mix' }]}
          />
        </View>
        <SettingsRow label="Export data" onPress={() => soon('Export data')} />
        <SettingsRow label="Import data" onPress={() => soon('Import data')} />
        <SettingsRow label="Delete all data" destructive onPress={wipe} last />
      </Card>
      <Text variant="caption" style={{ textAlign: 'center' }}>All data stays on your device.</Text>
    </Screen>
  );
}
