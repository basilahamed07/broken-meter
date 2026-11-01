import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { type } from './theme';

type Variant = keyof typeof type;
export function Text({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  return <RNText {...rest} style={[type[variant], style]} />;
}
