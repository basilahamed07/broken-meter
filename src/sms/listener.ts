import { PermissionsAndroid, Platform } from 'react-native';
import { getCycle } from '../budget/cycle';
import * as q from '../db/queries';
import { processSms } from './handler';
import { parseDebitSms } from './parser';
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

let busy = false;
let again = false;

/** Process SMS queued natively (received while the app was closed or not listening). Returns how many were processed. */
export async function drainSmsQueue(onChange: () => void): Promise<number> {
  const native = getSmsNative();
  if (!native || !native.hasPermission()) return 0;
  if (busy) {
    again = true; // an SMS arrived mid-drain: run once more when the current drain ends
    return 0;
  }
  busy = true;
  try {
    const msgs = await native.drainQueue();
    const outcomes: string[] = [];
    for (const m of msgs) {
      const outcome = await processSms(m, { notify: true });
      const amt = parseDebitSms(m.body, m.address)?.amount;
      outcomes.push(`${outcome}${amt != null ? `(Rs ${amt / 100})` : ''}`);
    }
    console.log('[sms] drained', msgs.length, 'outcomes', outcomes.join(',') || '-');
    if (msgs.length) onChange();
    return msgs.length;
  } catch (e) {
    console.log('[sms] drain failed', e instanceof Error ? e.message : String(e));
    return 0; // never crash the app because of an SMS
  } finally {
    busy = false;
    if (again) {
      again = false;
      drainSmsQueue(onChange).catch(() => {});
    }
  }
}

/** Start listening for new SMS and catch up on any queued while the app was closed. Returns a stop function. */
export function startSmsListener(onChange: () => void): () => void {
  const native = getSmsNative();
  if (!native || !native.hasPermission()) {
    console.log('[sms] listener not started (no native module or no permission)');
    return () => {};
  }
  console.log('[sms] listener started');
  const sub = native.addListener('onSmsQueued', () => { drainSmsQueue(onChange); });
  drainSmsQueue(onChange);
  return () => sub.remove();
}
