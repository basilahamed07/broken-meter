import { NativeModule, requireOptionalNativeModule } from 'expo';

export interface RawSms { address: string; body: string; date: number }

declare class SmsReaderNative extends NativeModule<{ onSmsQueued: () => void }> {
  hasPermission(): boolean;
  readInbox(sinceMs: number): Promise<RawSms[]>;
  drainQueue(): Promise<RawSms[]>;
}

/**
 * null when the native side is not present. requireNativeModule would throw while the module loads, and in a
 * release build that throw is reported as a FATAL error and kills the app, so the optional variant is used.
 */
export default requireOptionalNativeModule<SmsReaderNative>('SmsReader');
