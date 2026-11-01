import { PermissionsAndroid, Platform } from 'react-native';
import { getCycle } from '../budget/cycle';
import * as q from '../db/queries';
import { processSms } from './handler';
import { getSmsNative } from './native';

export const smsAvailable = (): boolean => getSmsNative() !== null;
export const smsPermissionGranted = (): boolean => getSmsNative()?.hasPermission() ?? false;

/** Ask for READ_SMS + RECEIVE_SMS. Returns false if denied or unavailable. The app works fully without it. */
export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || !getSmsNative()) return false;
  const r = await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.READ_SMS, PermissionsAndroid.PERMISSIONS.RECEIVE_SMS]);
  return r[PermissionsAndroid.PERMISSIONS.READ_SMS] === 'granted' && r[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === 'granted';
}

/** One-off scan of the current cycle's past SMS. Returns how many new debits were added. */
export async function scanPastSms(): Promise<number> {
  const native = getSmsNative();
  if (!native || !native.hasPermission()) return 0;
  const s = await q.getSettings();
  const since = getCycle(new Date(), s.salaryDay).start.getTime();
  const msgs = await native.readInbox(since);
  let added = 0;
  // oldest first so pending matching and streaks behave
  for (const m of [...msgs].reverse()) {
    const r = await processSms(m, { notify: false });
    if (r === 'saved' || r === 'asked') added += 1;
  }
  return added;
}

/** Start listening for new SMS and catch up on any queued while the app was closed. Returns a stop function. */
export function startSmsListener(onChange: () => void): () => void {
  const native = getSmsNative();
  if (!native || !native.hasPermission()) return () => {};
  let busy = false;
  const drain = async () => {
    if (busy) return;
    busy = true;
    try {
      const msgs = await native.drainQueue();
      for (const m of msgs) await processSms(m, { notify: true });
      if (msgs.length) onChange();
    } catch {
      // never crash the app because of an SMS
    } finally {
      busy = false;
    }
  };
  const sub = native.addListener('onSmsQueued', drain);
  drain();
  return () => sub.remove();
}
