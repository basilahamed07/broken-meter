import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './Text';
import { colors, radius } from './theme';

export function SegmentedControl<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.inner, padding: 4 }}>
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.chip, backgroundColor: sel ? colors.accentBg : 'transparent' }}>
            <Text variant="body" style={{ color: sel ? colors.accentText : colors.text }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
