import { Platform } from 'react-native';

export interface RawSms { address: string; body: string; date: number }
export interface SmsNative {
  hasPermission(): boolean;
  readInbox(sinceMs: number): Promise<RawSms[]>;
  drainQueue(): Promise<RawSms[]>;
  addListener(name: 'onSmsQueued', cb: () => void): { remove: () => void };
}

let cached: SmsNative | null | undefined;

/** The Android-only native module, or null where it does not exist (web, tests, other platforms). */
export function getSmsNative(): SmsNative | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (Platform.OS === 'android') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cached = require('../../modules/sms-reader').default as SmsNative;
    } catch {
      cached = null;
    }
  }
  return cached;
}
