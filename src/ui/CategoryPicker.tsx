import React from 'react';
import { ScrollView } from 'react-native';
import type { Category } from '../db/types';
import { Chip } from './Chip';

export function CategoryPicker({ categories, value, onChange, suggested }: { categories: Category[]; value: number | null; onChange: (id: number) => void; suggested?: number[] }) {
  const order = suggested?.length
    ? [...categories].sort((a, b) => (suggested.includes(b.id) ? 1 : 0) - (suggested.includes(a.id) ? 1 : 0))
    : categories;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {order.map((c) => <Chip key={c.id} label={`${c.emoji} ${c.name}`} selected={value === c.id} onPress={() => onChange(c.id)} />)}
    </ScrollView>
  );
}
