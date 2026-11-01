import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { addCategory, deleteCategory, reorderCategories, updateCategory } from '../../src/db/queries';
import type { Category } from '../../src/db/types';
import { formatRupees, parseAmountToPaise } from '../../src/lib/money';
import { useApp } from '../../src/state/AppContext';
import { Card, Chip, EmojiPicker, PrimaryButton, Screen, SecondaryButton, Text, TextField, colors } from '../../src/ui';

interface Draft { id: number | null; emoji: string; name: string; limit: string }

export default function CategorySettings() {
  const router = useRouter();
  const { categories, refresh } = useApp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.name.trim()) return Alert.alert('Name needed', 'Give the category a name.');
    const c = { name: draft.name, emoji: draft.emoji || '📦', monthlyLimit: parseAmountToPaise(draft.limit) };
    if (draft.id == null) await addCategory(c);
    else await updateCategory(draft.id, c);
    setDraft(null);
    await refresh();
  };

  const move = async (i: number, dir: -1 | 1) => {
    const ids = categories.map((c) => c.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await reorderCategories(ids);
    await refresh();
  };

  const confirmDelete = async (reassignTo: number | null) => {
    if (!deleting) return;
    await deleteCategory(deleting.id, reassignTo);
    setDeleting(null);
    await refresh();
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Text style={{ fontSize: 26, color: colors.textSecondary }}>‹</Text></Pressable>
        <Text variant="title">Categories</Text>
      </View>

      {draft ? (
        <Card style={{ gap: 12 }}>
          <Text variant="heading">{draft.id == null ? 'New category' : 'Edit category'}</Text>
          <EmojiPicker value={draft.emoji} onPick={(e) => setDraft({ ...draft, emoji: e })} />
          <TextField placeholder="Name" value={draft.name} onChangeText={(t) => setDraft({ ...draft, name: t })} />
          <TextField placeholder="Monthly limit (₹)" keyboardType="numeric" value={draft.limit} onChangeText={(t) => setDraft({ ...draft, limit: t.replace(/[^0-9.]/g, '') })} />
          <PrimaryButton label="Save" onPress={saveDraft} />
          <SecondaryButton label="Cancel" onPress={() => setDraft(null)} />
        </Card>
      ) : null}

      {deleting ? (
        <Card style={{ gap: 12 }}>
          <Text variant="heading">Delete {deleting.emoji} {deleting.name}?</Text>
          <Text variant="caption">Move its expenses to another category:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {categories.filter((c) => c.id !== deleting.id).map((c) => (
              <Chip key={c.id} label={`${c.emoji} ${c.name}`} onPress={() => confirmDelete(c.id)} />
            ))}
          </View>
          <SecondaryButton label="Leave uncategorised" onPress={() => confirmDelete(null)} />
          <SecondaryButton label="Cancel" onPress={() => setDeleting(null)} />
        </Card>
      ) : null}

      <Card style={{ paddingVertical: 4 }}>
        {categories.map((c, i) => (
          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10, borderBottomWidth: i === categories.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
            <Pressable style={{ flex: 1, flexDirection: 'row', gap: 10, alignItems: 'center' }} onPress={() => setDraft({ id: c.id, emoji: c.emoji, name: c.name, limit: String(c.monthlyLimit / 100) })}>
              <Text style={{ fontSize: 20 }}>{c.emoji}</Text>
              <View>
                <Text variant="body">{c.name}</Text>
                <Text variant="caption">{formatRupees(c.monthlyLimit)} / month</Text>
              </View>
            </Pressable>
            <Pressable onPress={() => move(i, -1)} hitSlop={8}><Text style={{ color: colors.textSecondary, fontSize: 18 }}>▲</Text></Pressable>
            <Pressable onPress={() => move(i, 1)} hitSlop={8}><Text style={{ color: colors.textSecondary, fontSize: 18 }}>▼</Text></Pressable>
            <Pressable onPress={() => setDeleting(c)} hitSlop={8}><Text style={{ color: colors.danger, fontSize: 18 }}>✕</Text></Pressable>
          </View>
        ))}
      </Card>
      <SecondaryButton label="＋ Add category" onPress={() => setDraft({ id: null, emoji: '📦', name: '', limit: '' })} />
    </Screen>
  );
}
