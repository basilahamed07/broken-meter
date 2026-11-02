import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { applyBackup, exportCsv, exportJson, pickBackup } from '../../src/backup/files';
import { deleteAllData } from '../../src/db/queries';
import { requestSmsPermission, scanPastSms, smsAvailable, smsPermissionGranted } from '../../src/sms/listener';
import { formatRupees } from '../../src/lib/money';
import { useApp } from '../../src/state/AppContext';
import { Card, Screen, SegmentedControl, SettingsRow, Text, colors } from '../../src/ui';

export default function Settings() {
  const router = useRouter();
  const { settings, updateSettings, refresh, categories, smsPermissionChanged } = useApp();

  const toggleSms = async () => {
    if (!smsAvailable()) return Alert.alert('SMS tracking', 'This is available in the Android app.');
    if (smsPermissionGranted()) {
      return Alert.alert('SMS tracking is on', 'To turn it off, remove the SMS permission in Android Settings > Apps > Broke Meter > Permissions.', [
        { text: 'Scan this cycle again', onPress: () => scanPastSms().then((n) => Alert.alert('Done', `${n} new spends added.`)) },
        { text: 'OK', style: 'cancel' },
      ]);
    }
    const ok = await requestSmsPermission();
    if (!ok) return Alert.alert('SMS not allowed', 'On Android 13+, sideloaded apps need: Settings > Apps > Broke Meter > ⋮ > Allow restricted settings. Then try again. Manual entry still works.');
    smsPermissionChanged();
    await refresh();
    Alert.alert('Scan past SMS?', "Add this cycle's bank debits from your inbox. Nothing leaves your phone.", [
      { text: 'Not now', style: 'cancel' },
      { text: 'Scan', onPress: () => scanPastSms().then(async (n) => { await refresh(); Alert.alert('Done', `${n} spends added.`); }) },
    ]);
  };
  const fail = (e: unknown) => Alert.alert('Something went wrong', e instanceof Error ? e.message : 'Please try again.');
  const doExport = () =>
    Alert.alert('Export data', 'Choose a format. The file is shared through the Android share sheet and never uploaded by this app.', [
      { text: 'JSON (full backup)', onPress: () => exportJson().catch(fail) },
      { text: 'CSV (transactions)', onPress: () => exportCsv().catch(fail) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  const doImport = async () => {
    try {
      const picked = await pickBackup();
      if (!picked) return;
      Alert.alert('Replace your data?', `This backup has ${picked.transactions} transactions and ${picked.categories} categories. Importing REPLACES everything currently on this phone.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace my data', style: 'destructive', onPress: async () => { try { await applyBackup(picked.text); await refresh(); router.replace('/'); } catch (e) { fail(e); } } },
      ]);
    } catch (e) {
      fail(e);
    }
  };
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
        <SettingsRow label="Auto-track bank SMS" value={smsAvailable() ? (smsPermissionGranted() ? 'On' : 'Off') : 'Android only'} onPress={toggleSms} />
        <SettingsRow label="Insights" onPress={() => router.push('/insights')} />
        <SettingsRow label="Categories" value={`${categories.length}`} onPress={() => router.push('/settings/categories')} />
        <View style={{ paddingVertical: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text variant="body" style={{ fontSize: 16 }}>Roast language</Text>
          <SegmentedControl
            value={settings.roastLanguage}
            onChange={(v) => updateSettings({ roastLanguage: v })}
            options={[{ value: 'english', label: 'English' }, { value: 'tanglish', label: 'Tanglish' }, { value: 'mix', label: 'Mix' }]}
          />
        </View>
        <SettingsRow label="Export data" onPress={doExport} />
        <SettingsRow label="Import data" onPress={doImport} />
        <SettingsRow label="Delete all data" destructive onPress={wipe} last />
      </Card>
      <Text variant="caption" style={{ textAlign: 'center' }}>All data stays on your device.</Text>
    </Screen>
  );
}
