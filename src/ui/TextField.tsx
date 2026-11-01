import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { colors, fonts, radius } from './theme';

export function TextField(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      selectionColor={colors.accentText}
      {...props}
      style={[{ backgroundColor: colors.surface, color: colors.text, fontFamily: fonts.regular, fontSize: 16, borderRadius: radius.inner, paddingVertical: 14, paddingHorizontal: 14 }, props.style]}
    />
  );
}
