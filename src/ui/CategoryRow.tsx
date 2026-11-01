import React from 'react';
import { Pressable, View } from 'react-native';
import { formatRupees } from '../lib/money';
import { getLevel, usageRatio } from '../budget/levels';
import { ProgressBar } from './ProgressBar';
import { Text } from './Text';
import { levelColors } from './theme';

export function CategoryRow({ emoji, name, spent, limit, onPress }: { emoji: string; name: string; spent: number; limit: number; onPress?: () => void }) {
  const level = getLevel(spent, limit);
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 8, gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="body">{emoji}  {name}</Text>
        <Text variant="body" style={{ color: level === 'broke' ? levelColors.broke.text : undefined }}>
          {formatRupees(spent)} / {formatRupees(limit)}
        </Text>
      </View>
      <ProgressBar ratio={usageRatio(spent, limit)} color={levelColors[level].bar} />
    </Pressable>
  );
}
