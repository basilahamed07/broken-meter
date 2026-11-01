import { TextStyle } from 'react-native';
import type { Level } from '../budget/levels';

/** Dark theme matched to the Broke Meter mockup. All colours live here. */
export const colors = {
  page: '#111111',
  card: '#181818',
  surface: '#101010', // inner cards / inputs sit darker than the card
  border: 'rgba(255,255,255,0.10)',
  text: '#F2F1EC',
  textSecondary: '#A8A7A1',
  textMuted: '#77766F',
  accentBg: '#0B2A55',
  accentText: '#5BA7F7',
  danger: '#E5605F',
  success: '#3FBF6A',
  warn: '#EF9F27',
  track: '#262626',
  overlay: 'rgba(0,0,0,0.6)',
} as const;

export const levelColors: Record<Level, { bar: string; bg: string; text: string; emoji: string }> = {
  chill: { bar: '#1D9E75', bg: '#0F2A22', text: '#4CC9A0', emoji: '😎' },
  warning: { bar: '#EF9F27', bg: '#2E1D05', text: '#F0A93A', emoji: '🤔' },
  danger: { bar: '#D85A30', bg: '#331509', text: '#F0805A', emoji: '😬' },
  broke: { bar: '#E24B4A', bg: '#3A0F10', text: '#EF6A69', emoji: '💀' },
};

export const radius = { card: 16, inner: 12, chip: 8, bar: 4 } as const;
export const space = { screen: 16, card: 16, gap: 12, gapSm: 10 } as const;
export const barHeight = 8;

export const fonts = { regular: 'Inter_400Regular', medium: 'Inter_500Medium' } as const;

export const type: Record<'money' | 'moneyL' | 'title' | 'heading' | 'body' | 'caption', TextStyle> = {
  money: { fontFamily: fonts.medium, fontSize: 30, color: colors.text },
  moneyL: { fontFamily: fonts.medium, fontSize: 32, color: colors.text },
  title: { fontFamily: fonts.medium, fontSize: 18, color: colors.text },
  heading: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  caption: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
};
