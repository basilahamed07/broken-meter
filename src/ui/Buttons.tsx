import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import { Text } from './Text';
import { colors, radius } from './theme';

interface BtnProps { label: string; onPress?: () => void; disabled?: boolean; style?: StyleProp<ViewStyle>; flex?: boolean }

export function PrimaryButton({ label, onPress, disabled, style }: BtnProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [{ backgroundColor: colors.accentBg, borderRadius: radius.inner, paddingVertical: 16, alignItems: 'center', opacity: disabled ? 0.4 : pressed ? 0.8 : 1 }, style]}
    >
      <Text variant="heading" style={{ color: colors.accentText, fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled, style }: BtnProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.inner, paddingVertical: 16, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }, style]}
    >
      <Text variant="body" style={{ fontSize: 16, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}
