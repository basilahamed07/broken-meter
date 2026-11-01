import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { barHeight, colors, radius } from './theme';

export function ProgressBar({ ratio, color }: { ratio: number; color: string }) {
  const w = useRef(new Animated.Value(0)).current;
  const target = Math.max(0, Math.min(1, ratio));
  useEffect(() => {
    Animated.timing(w, { toValue: target, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [target, w]);
  return (
    <View style={{ height: barHeight, borderRadius: radius.bar, backgroundColor: colors.track, overflow: 'hidden' }}>
      <Animated.View
        style={{
          height: barHeight,
          borderRadius: radius.bar,
          backgroundColor: color,
          width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}
