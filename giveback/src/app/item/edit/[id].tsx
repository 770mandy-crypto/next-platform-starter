import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';

import { Button, Chip, Field, Loading, Text } from '@/components/ui';
import { getItem, updateItem } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CATEGORIES } from '@/lib/catalog';
import { deletePhotos, pickPhotos, takePhoto, uploadPhoto, type LocalPhoto } from '@/lib/photos';
import { photoUrl } from '@/lib/supabase';
import type { ItemCard } from '@/lib/types';
import { goBack } from '@/lib/nav';
import { colors, radius, space } from '@/theme';

const MAX_PHOTOS = 6;

// A photo on the listing is either already uploaded (a storage path) or new
// on this screen (a local file, uploaded when saving).
type Photo = { kind: 'stored'; path: string } | { kind: 'local'; photo: LocalPhoto };

export default function EditItem() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: item, isLoading } = useQuery({ queryKey: ['item', id], queryFn: () => getItem(id) });
  if (isLoading || !item) return <Loading />;
  return <EditForm item={item} />;
}

function EditForm({ item }: { item: ItemCard }) {
  const id = item.id;
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [pickupNotes, setPickupNotes] = useState(item.pickup_notes ?? '');
  const [cat, setCat] = useState(item.category);
  const [photos, setPhotos] = useState<Photo[]>(item.photos.map((path) => ({ kind: 'stored', path })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uri = (p: Photo) => (p.kind === 'stored' ? photoUrl(p.path)! : p.photo.uri);

  async function add(source: 'camera' | 'library') {
    setError(null);
    try {
      const added =
        source === 'camera'
          ? [await takePhoto()].filter((p): p is LocalPhoto => !!p)
          : await pickPhotos(MAX_PHOTOS - photos.length);
      setPhotos((all) => [...all, ...added.map((photo) => ({ kind: 'local' as const, photo }))].slice(0, MAX_PHOTOS));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function makePrimary(index: number) {
    setPhotos((all) => [all[index], ...all.filter((_, i) => i !== index)]);
  }

  async function save() {
    if (!userId) return;
    if (item.kind === 'offer' && photos.length === 0) return setError('צריך לפחות תמונה אחת של הפריט');
    setBusy(true);
    setError(null);
    try {
      const paths = await Promise.all(
        photos.map((p) => (p.kind === 'stored' ? Promise.resolve(p.path) : uploadPhoto(userId, p.photo))),
      );
      await updateItem(id, {
        title: title.trim(),
        description: description.trim(),
        pickup_notes: pickupNotes.trim(),
        category: cat,
        photos: paths,
      });
      await deletePhotos(item.photos.filter((p) => !paths.includes(p)));
      queryClient.invalidateQueries({ queryKey: ['item', id] });
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['my-items'] });
      goBack(`/item/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: space.lg, gap: space.lg, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
      <View style={{ gap: space.sm }}>
        <Text variant="label" weight="bold">
          תמונות
        </Text>
        <Text variant="caption" color={colors.muted}>
          הראשונה היא זו שמופיעה בחיפוש. לחצו על תמונה כדי להפוך אותה לראשית.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {photos.map((p, i) => (
            <Pressable
              key={uri(p)}
              testID={`edit-photo-${i}`}
              accessibilityLabel={i === 0 ? 'תמונה ראשית' : 'הפיכה לתמונה ראשית'}
              onPress={() => makePrimary(i)}
              style={{
                width: 96,
                height: 96,
                borderRadius: radius.md,
                overflow: 'hidden',
                borderWidth: i === 0 ? 3 : 0,
                borderColor: colors.primary,
              }}>
              <Image source={{ uri: uri(p) }} style={{ flex: 1 }} contentFit="cover" />
              {i === 0 && (
                <View style={{ position: 'absolute', bottom: 0, start: 0, end: 0, backgroundColor: colors.primary }}>
                  <Text variant="caption" weight="bold" color={colors.white} style={{ textAlign: 'center' }}>
                    ראשית
                  </Text>
                </View>
              )}
              <Pressable
                accessibilityLabel="הסרת תמונה"
                onPress={() => setPhotos((all) => all.filter((_, j) => j !== i))}
                style={{
                  position: 'absolute',
                  top: 4,
                  end: 4,
                  backgroundColor: colors.overlay,
                  borderRadius: 12,
                  padding: 2,
                }}>
                <Ionicons name="close" size={16} color={colors.white} />
              </Pressable>
            </Pressable>
          ))}
          {photos.length < MAX_PHOTOS && (
            <>
              {Platform.OS !== 'web' && <AddButton icon="camera" label="צילום" onPress={() => add('camera')} />}
              <AddButton icon="images" label="הוספה" onPress={() => add('library')} testID="edit-add-photo" />
            </>
          )}
        </View>
      </View>
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
      <Button testID="save-item" title="שמירה" onPress={save} loading={busy} disabled={title.trim().length < 2} />
    </ScrollView>
  );
}

function AddButton({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: 'camera' | 'images';
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: 96,
        height: 96,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
      }}>
      <Ionicons name={icon} size={24} color={colors.primary} />
      <Text variant="caption" weight="bold" color={colors.primary}>
        {label}
      </Text>
    </Pressable>
  );
}
