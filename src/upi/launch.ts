import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';

export const GPAY_PACKAGE = 'com.google.android.apps.nbu.paisa.user';

/**
 * Launch the ORIGINAL UPI string, preferring GPay, falling back to the generic UPI chooser.
 * Returns which route worked.
 */
export async function launchUpi(upiString: string): Promise<'gpay' | 'chooser' | 'failed'> {
  if (Platform.OS !== 'android') return 'failed';
  try {
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: upiString, packageName: GPAY_PACKAGE });
    return 'gpay';
  } catch {
    try {
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: upiString });
      return 'chooser';
    } catch {
      try {
        await Linking.openURL(upiString);
        return 'chooser';
      } catch {
        return 'failed';
      }
    }
  }
}

/** P2P: open GPay normally. No amount is prefilled because GPay often blocks it. */
export async function openGpay(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    await IntentLauncher.startActivityAsync('android.intent.action.MAIN', { packageName: GPAY_PACKAGE, category: 'android.intent.category.LAUNCHER' });
    return true;
  } catch {
    try {
      await Linking.openURL('upi://pay');
      return true;
    } catch {
      return false;
    }
  }
}
