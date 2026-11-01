import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './Text';
import { colors } from './theme';

export function SettingsRow({ label, value, onPress, destructive, last }: { label: string; value?: string; onPress?: () => void; destructive?: boolean; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text variant="body" style={{ fontSize: 16, color: destructive ? colors.danger : colors.text }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        {value ? <Text variant="caption">{value}</Text> : null}
        {onPress && !destructive ? <Text variant="body" style={{ color: colors.textMuted }}>›</Text> : null}
      </View>
    </Pressable>
  );
}
