import * as Sharing from 'expo-sharing';
import { RefObject } from 'react';
import { captureRef } from 'react-native-view-shot';

/** Capture a view as a PNG and open the Android share sheet. Nothing is uploaded by the app. */
export async function shareView(ref: RefObject<unknown>): Promise<boolean> {
  try {
    const uri = await captureRef(ref as RefObject<any>, { format: 'png', quality: 1 });
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share' });
    return true;
  } catch {
    return false;
  }
}

import * as Haptics from 'expo-haptics';
import type { Level } from '../budget/levels';
/** Light haptic cue when a screen opens at warning, danger or broke. */
export function hapticLight(level: Level): void {
  try {
    if (level === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else if (level === 'danger') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    else if (level === 'broke') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // best effort
  }
}
