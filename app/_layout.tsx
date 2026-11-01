import { Inter_400Regular, Inter_500Medium, useFonts } from '@expo-google-fonts/inter';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ASK_ACTION_PREFIX, setupNotifications } from '../src/notify/alerts';
import { categorizeFromNotification } from '../src/sms/handler';
import { AppProvider, useApp } from '../src/state/AppContext';
import { PendingPrompt, colors } from '../src/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Gate() {
  const { ready, refresh } = useApp();
  const lastResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const id = lastResponse?.actionIdentifier;
    const txId = (lastResponse?.notification.request.content.data as { txId?: number } | undefined)?.txId;
    if (id && id.startsWith(ASK_ACTION_PREFIX) && txId) {
      categorizeFromNotification(txId, Number(id.slice(ASK_ACTION_PREFIX.length))).then(refresh).catch(() => {});
    }
  }, [lastResponse, refresh]);
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium });
  useEffect(() => {
    setupNotifications().catch(() => {});
  }, []);
  useEffect(() => {
    if (ready && fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [ready, fontsLoaded]);
  if (!ready || !fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.page }} />;
  return (
    <>
    <PendingPrompt />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.page }, animation: 'fade_from_bottom' }}>
      <Stack.Screen name="add-expense" options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }} />
    </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppProvider>
        <Gate />
      </AppProvider>
    </SafeAreaProvider>
  );
}
