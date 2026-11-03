import { NativeModule, requireOptionalNativeModule } from 'expo';

export interface UpiApp { packageName: string; label: string }

declare class UpiLauncherNative extends NativeModule {
  getUpiApps(uri: string): UpiApp[];
  launch(uri: string, pkg: string | null): boolean;
  openApp(pkg: string): boolean;
}

/** null when the native side is not present (never throws while loading). */
export default requireOptionalNativeModule<UpiLauncherNative>('UpiLauncher');
