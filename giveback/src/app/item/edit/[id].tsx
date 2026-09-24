import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button, Chip, Field, Loading, Text } from '@/components/ui';
import { getItem, updateItem } from '@/lib/api';
import { CATEGORIES } from '@/lib/catalog';
import type { ItemCard } from '@/lib/types';
import { colors, space } from '@/theme';

export default function EditItem() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: item, isLoading } = useQuery({ queryKey: ['item', id], queryFn: () => getItem(id) });
  if (isLoading || !item) return <Loading />;
  return <EditForm item={item} />;
}

function EditForm({ item }: { item: ItemCard }) {
  const id = item.id;
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [pickupNotes, setPickupNotes] = useState(item.pickup_notes ?? '');
  const [cat, setCat] = useState(item.category);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await updateItem(id, {
        title: title.trim(),
        description: description.trim(),
        pickup_notes: pickupNotes.trim(),
        category: cat,
      });
      queryClient.invalidateQueries({ queryKey: ['item', id] });
      queryClient.invalidateQueries({ queryKey: ['search'] });
      router.back();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: space.lg, gap: space.lg, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
      <Field label="כותרת" value={title} onChangeText={setTitle} maxLength={80} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {CATEGORIES.map((c) => (
          <Chip key={c.id} label={c.label} selected={cat === c.id} onPress={() => setCat(c.id)} />
        ))}
      </View>
      <Field
        label="תיאור"
        multiline
        style={{ minHeight: 100 }}
        value={description}
        onChangeText={setDescription}
        maxLength={2000}
      />
      {item.kind === 'offer' && (
        <Field label="מתי נוח לאסוף?" value={pickupNotes} onChangeText={setPickupNotes} maxLength={200} />
      )}
      {error && <Text color={colors.danger}>{error}</Text>}
      <Button title="שמירה" onPress={save} loading={busy} disabled={title.trim().length < 2} />
    </ScrollView>
  );
}
