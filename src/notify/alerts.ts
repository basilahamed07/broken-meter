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
