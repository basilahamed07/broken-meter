import React from 'react';
import { Pressable, ScrollView } from 'react-native';
import { Text } from './Text';
import { colors, radius } from './theme';

export const EMOJIS = ['🛒', '🍔', '🚌', '🛍️', '💡', '📦', '🏠', '🎬', '💊', '📱', '☕', '🍕', '⛽', '🎓', '🎁', '✈️', '💇', '🐶', '🏋️', '🧾'];

export function EmojiPicker({ value, onPick }: { value: string; onPick: (e: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {EMOJIS.map((e) => (
        <Pressable key={e} onPress={() => onPick(e)} style={{ padding: 8, borderRadius: radius.chip, backgroundColor: value === e ? colors.accentBg : colors.surface }}>
          <Text style={{ fontSize: 22 }}>{e}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
