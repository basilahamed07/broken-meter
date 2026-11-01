import { Stack } from 'expo-router';
import React from 'react';
import { colors } from '../../src/ui';

export default function SettingsLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.page } }} />;
}
