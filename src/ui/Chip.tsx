import React from 'react';
import { Pressable } from 'react-native';
import { Text } from './Text';
import { colors, radius } from './theme';

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ backgroundColor: selected ? colors.accentBg : colors.surface, borderRadius: radius.chip, paddingVertical: 10, paddingHorizontal: 14 }}
    >
      <Text variant="body" style={{ color: selected ? colors.accentText : colors.text, fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}
