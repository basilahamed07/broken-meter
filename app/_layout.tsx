import { Inter_400Regular, Inter_500Medium, useFonts } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setupNotifications } from '../src/notify/alerts';
import { AppProvider, useApp } from '../src/state/AppContext';
import { colors } from '../src/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Gate() {
  const { ready } = useApp();
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium });
  useEffect(() => {
    setupNotifications().catch(() => {});
  }, []);
  useEffect(() => {
    if (ready && fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [ready, fontsLoaded]);
  if (!ready || !fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.page }} />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.page }, animation: 'fade_from_bottom' }}>
      <Stack.Screen name="add-expense" options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }} />
    </Stack>
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
