import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import type { Level } from '../budget/levels';
import { Text } from './Text';
import { levelColors, radius } from './theme';

/** Tinted card with big emoji, title and roast line, centered. Scales in 0.95 -> 1 over 200ms. */
export function LevelCard({ level, title, line, emoji, bg, color, subline }: {
  level?: Level; title: string; line: string; emoji?: string; bg?: string; color?: string; subline?: string;
}) {
  const lc = level ? levelColors[level] : undefined;
  const scale = useRef(new Animated.Value(0.95)).current;
  useEffect(() => {
    scale.setValue(0.95);
    Animated.timing(scale, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [line, title, scale]);
  const textColor = color ?? lc?.text;
  return (
    <Animated.View
      style={{ transform: [{ scale }], backgroundColor: bg ?? lc?.bg, borderRadius: radius.inner, paddingVertical: 20, paddingHorizontal: 16, alignItems: 'center', gap: 8 }}
    >
      <Text style={{ fontSize: 44, lineHeight: 54 }}>{emoji ?? lc?.emoji}</Text>
      <Text variant="title" style={{ color: textColor, textAlign: 'center' }}>{title}</Text>
      <Text variant="body" style={{ color: textColor, textAlign: 'center' }}>{line}</Text>
      {subline ? <Text variant="caption" style={{ color: textColor, textAlign: 'center' }}>{subline}</Text> : null}
    </Animated.View>
  );
}
