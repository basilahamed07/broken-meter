import React from 'react';
import { Card } from './Card';
import { Text } from './Text';

export function TipCard({ text }: { text: string }) {
  return (
    <Card inner>
      <Text variant="body">💡 {text}</Text>
    </Card>
  );
}
