import React from 'react';
import { View, ViewProps } from 'react-native';
import { colors, radius, space } from './theme';

/** Main card (radius 16) or inner card (radius 12, darker surface). */
export function Card({ inner, style, ...rest }: ViewProps & { inner?: boolean }) {
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: inner ? colors.surface : colors.card,
          borderRadius: inner ? radius.inner : radius.card,
          borderWidth: inner ? 0 : 1,
          borderColor: colors.border,
          padding: inner ? 14 : space.card,
        },
        style,
      ]}
    />
  );
}
