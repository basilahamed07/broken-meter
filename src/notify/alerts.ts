import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Level } from '../budget/levels';

const CHANNEL = 'level-alerts';

/** Call once at app start. Local notifications only, nothing leaves the phone. */
export async function setupNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Budget alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
    });
  }
}

export async function notificationsGranted(): Promise<boolean> {
  const p = await Notifications.getPermissionsAsync();
  return p.granted;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const r = await Notifications.requestPermissionsAsync();
  return r.granted;
}

export async function notifyLevel(title: string, body: string): Promise<void> {
  try {
    if (!(await notificationsGranted())) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, ...(Platform.OS === 'android' ? { channelId: CHANNEL } : {}) } as Notifications.NotificationContentInput,
      trigger: null,
    });
  } catch {
    // notifications are best-effort
  }
}

export async function hapticForLevel(level: Level): Promise<void> {
  try {
    if (level === 'warning') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else if (level === 'danger') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    else if (level === 'broke') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // haptics are best-effort
  }
}

export const ASK_ACTION_PREFIX = 'cat:';

/** "₹500 to Arun, which category?" with the top 3 categories as action buttons. */
export async function notifyAskCategory(txId: number, text: string, options: { id: number; label: string }[]): Promise<void> {
  try {
    if (!(await notificationsGranted())) return;
    const categoryId = `ask-${txId}`;
    await Notifications.setNotificationCategoryAsync(
      categoryId,
      options.slice(0, 3).map((o) => ({ identifier: `${ASK_ACTION_PREFIX}${o.id}`, buttonTitle: o.label, options: { opensAppToForeground: true } })),
    );
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Which category?', body: text, categoryIdentifier: categoryId, data: { txId }, ...(Platform.OS === 'android' ? { channelId: CHANNEL } : {}) } as Notifications.NotificationContentInput,
      trigger: null,
    });
  } catch {
    // best effort
  }
}
