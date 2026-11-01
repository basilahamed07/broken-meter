import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { dumpAll, restoreAll } from '../db/queries';
import { parseBackup, toCsv } from './backup';

async function shareText(name: string, text: string, mime: string): Promise<void> {
  const uri = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.writeAsStringAsync(uri, text);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: name });
}

const stamp = () => new Date().toISOString().slice(0, 10);

export async function exportJson(): Promise<void> {
  await shareText(`broke-meter-${stamp()}.json`, JSON.stringify(await dumpAll(), null, 1), 'application/json');
}

export async function exportCsv(): Promise<void> {
  const d = await dumpAll();
  await shareText(`broke-meter-${stamp()}.csv`, toCsv(d.transactions, d.categories), 'text/csv');
}

export interface PickedBackup { text: string; transactions: number; categories: number }

/** Let the user pick a backup file and validate it. Does NOT change any data yet. */
export async function pickBackup(): Promise<PickedBackup | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (r.canceled || !r.assets?.length) return null;
  const text = await FileSystem.readAsStringAsync(r.assets[0].uri);
  const b = parseBackup(text); // throws a readable error
  return { text, transactions: b.transactions.length, categories: b.categories.length };
}

export async function applyBackup(text: string): Promise<void> {
  await restoreAll(parseBackup(text));
}
