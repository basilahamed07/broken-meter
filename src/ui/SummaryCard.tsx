import React from 'react';
import { View } from 'react-native';
import { Card } from './Card';
import { Text } from './Text';
import { colors } from './theme';

export function SummaryCard({ label, value, forecast, forecastColor, valueColor }: { label: string; value: string; forecast: string; forecastColor: string; valueColor?: string }) {
  return (
    <Card inner style={{ gap: 4 }}>
      <Text variant="body" style={{ color: colors.textSecondary }}>{label}</Text>
      <Text variant="money" style={valueColor ? { color: valueColor } : undefined}>{value}</Text>
      <Text variant="body" style={{ color: forecastColor }}>{forecast}</Text>
    </Card>
  );
}
