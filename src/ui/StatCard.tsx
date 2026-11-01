import React from 'react';
import { Card } from './Card';
import { Text } from './Text';
import { colors } from './theme';

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card inner style={{ flex: 1, gap: 4 }}>
      <Text variant="body" style={{ color: colors.textSecondary }}>{label}</Text>
      <Text variant="title" style={{ fontSize: 22 }}>{value}</Text>
    </Card>
  );
}
