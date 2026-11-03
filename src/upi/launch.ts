import { Linking, Platform } from 'react-native';
import UpiLauncher from '../../modules/upi-launcher';
import { prepareUpiUri } from './intent';

export const GPAY_PACKAGE = 'com.google.android.apps.nbu.paisa.user';

export type UpiApp = { packageName: string; label: string };

/** UPI apps installed on this phone (GPay first, then A-Z). Empty if the native module is missing. */
export function getUpiApps(uri: string): UpiApp[] {
  if (Platform.OS !== 'android' || !UpiLauncher) return [];
  try {
    const apps = UpiLauncher.getUpiApps(prepareUpiUri(uri));
    return [...apps].sort((a, b) => {
      if (a.packageName === GPAY_PACKAGE) return -1;
      if (b.packageName === GPAY_PACKAGE) return 1;
      return a.label.localeCompare(b.label);
    });
  } catch {
    return [];
  }
}

/**
 * Hand the UPI string to a UPI app like tapping a upi:// link. With `pkg` that app is targeted directly,
 * without it Android shows its chooser. Does not wait for the app to return.
 */
export async function launchUpi(rawUri: string, pkg?: string): Promise<'app' | 'chooser' | 'failed'> {
  if (Platform.OS !== 'android') return 'failed';
  const uri = prepareUpiUri(rawUri);
  if (UpiLauncher) {
    try {
      return UpiLauncher.launch(uri, pkg ?? null) ? (pkg ? 'app' : 'chooser') : 'failed';
    } catch {
      return 'failed';
    }
  }
  try {
    await Linking.openURL(uri);
    return 'chooser';
  } catch {
    return 'failed';
  }
}

/** Open a UPI app normally (no payment details). */
export function openUpiApp(pkg: string): boolean {
  if (Platform.OS !== 'android' || !UpiLauncher) return false;
  try {
    return UpiLauncher.openApp(pkg);
  } catch {
    return false;
  }
}

/** P2P: open GPay normally. No amount is prefilled because GPay often blocks it. */
export const openGpay = (): boolean => openUpiApp(GPAY_PACKAGE);
