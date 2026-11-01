import React from 'react';
import { ScrollView, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from './theme';

export function Screen({ children, scroll = true, style }: { children: React.ReactNode; scroll?: boolean; style?: ViewStyle }) {
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24, paddingHorizontal: space.screen };
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: colors.page }, pad, style]}>{children}</View>;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.page }} contentContainerStyle={[{ gap: space.gap }, pad, style]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}
