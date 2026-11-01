import { NativeModule, requireNativeModule } from 'expo';

export interface RawSms { address: string; body: string; date: number }

declare class SmsReaderNative extends NativeModule<{ onSmsQueued: () => void }> {
  hasPermission(): boolean;
  readInbox(sinceMs: number): Promise<RawSms[]>;
  drainQueue(): Promise<RawSms[]>;
}

export default requireNativeModule<SmsReaderNative>('SmsReader');
