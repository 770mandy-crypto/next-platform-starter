import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CityPicker } from '@/components/city-picker';
import { Button, Card, Chip, EmptyState, Field, Row, Segmented, Text } from '@/components/ui';
import { createItem, describePhoto, listCommunities } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CATEGORIES, CITIES, CONDITIONS } from '@/lib/catalog';
import { nearestCity, type Point } from '@/lib/geo';
import { describePlace, geocode, getGpsFix, useOrigin } from '@/lib/location';
import { pickPhotos, takePhoto, uploadPhoto, type LocalPhoto } from '@/lib/photos';
import type { ItemCondition, ItemKind } from '@/lib/types';
import { colors, radius, space } from '@/theme';

const MAX_PHOTOS = 6;

type Form = {
  title: string;
  description: string;
  category: string | null;
  condition: ItemCondition;
  pickupNotes: string;
  city: string | null;
  neighborhood: string;
  address: string;
  communityId: string | null;
};

const EMPTY: Form = {
  title: '',
  description: '',
  category: null,
  condition: 'good',
  pickupNotes: '',
  city: null,
  neighborhood: '',
  address: '',
  communityId: null,
};

export default function Post() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const { userId, requireAuth, profile } = useAuth();
  const { origin } = useOrigin();
  const queryClient = useQueryClient();

  const [kind, setKind] = useState<ItemKind>(params.kind === 'wanted' ? 'wanted' : 'offer');
  const [form, setForm] = useState<Form>(EMPTY);
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [gps, setGps] = useState<Point | null>(null);
  const [locating, setLocating] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [ai, setAi] = useState<{ state: 'idle' | 'working' | 'done' | 'blocked' | 'error'; message?: string }>({
    state: 'idle',
  });
  const [aiUsed, setAiUsed] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const touched = useRef(new Set<keyof Form>());

  // Follow ?kind= when the tab is opened from "post a request" elsewhere.
  const [kindParam, setKindParam] = useState(params.kind);
  if (params.kind !== kindParam) {
    setKindParam(params.kind);
    if (params.kind === 'wanted' || params.kind === 'offer') setKind(params.kind);
  }

  // Start from the searcher's city if we already know it.
  const city = form.city ?? (origin ? nearestCity(origin).name : null);

  const { data: communities = [] } = useQuery({
    queryKey: ['communities', 'mine', origin?.lat, origin?.lng],
    queryFn: async () => (await listCommunities(origin)).filter((c) => c.is_member),
    enabled: !!userId,
  });

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    touched.current.add(key);
    setForm((f) => ({ ...f, [key]: value }));
  };

  // The first photo is sent to Claude, which drafts the listing. It only fills
  // fields the user has not typed into, so it never overwrites their words.
  async function runAi(photo: LocalPhoto) {
    setAi({ state: 'working' });
    try {
      const result = await describePhoto(photo.base64);
      if (!result.allowed) {
        setAi({ state: 'blocked', message: result.moderation_reason || 'לא ניתן לפרסם את הפריט הזה' });
        return;
      }
      setForm((f) => ({
        ...f,
        title: touched.current.has('title') && f.title ? f.title : result.title,
        description: touched.current.has('description') && f.description ? f.description : result.description,
        category: touched.current.has('category') && f.category ? f.category : result.category,
        condition: touched.current.has('condition') ? f.condition : result.condition,
      }));
      setAiUsed(true);
      setAi({ state: 'done' });
    } catch (e) {
      setAi({ state: 'error', message: (e as Error).message });
    }
  }

  async function addPhotos(source: 'camera' | 'library') {
    setError(null);
    try {
      const added =
        source === 'camera'
          ? [await takePhoto()].filter((p): p is LocalPhoto => !!p)
          : await pickPhotos(MAX_PHOTOS - photos.length);
      if (!added.length) return;
      const wasEmpty = photos.length === 0;
      setPhotos((p) => [...p, ...added].slice(0, MAX_PHOTOS));
      if (wasEmpty && kind === 'offer') runAi(added[0]);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function useGps() {
    setLocating(true);
    setError(null);
    try {
      const fix = await getGpsFix();
      setGps(fix);
      const place = await describePlace(fix);
      setForm((f) => ({
        ...f,
        city: nearestCity(fix).name,
        neighborhood: f.neighborhood || place?.neighborhood || '',
        address: f.address || (kind === 'offer' && place?.street ? place.street + ' ' : f.address),
      }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLocating(false);
    }
  }

  async function publish() {
    if (!requireAuth() || !userId) return;
    setError(null);
    if (ai.state === 'blocked') return setError(ai.message ?? 'לא ניתן לפרסם את הפריט הזה');
    // The photo is the listing: people decide from it, and see exactly what they will get.
    if (kind === 'offer' && photos.length === 0) return setError('הוסיפו לפחות תמונה אחת של הפריט עצמו');
    if (form.title.trim().length < 2) return setError('מה מוסרים? כתבו כותרת קצרה');
    if (!form.category) return setError('בחרו קטגוריה');
    if (!city) return setError('בחרו עיר');

    setPublishing(true);
    try {
      const place = CITIES.find((c) => c.name === city)!;
      // Best point first: the typed address pinned on the phone, then GPS,
      // then the city centre. Only the first two count as precise.
      const pinned =
        kind === 'offer' && form.address ? await geocode(`${form.address}, ${place.name}`, gps ?? place) : null;
      const location = pinned ?? gps ?? { lat: place.lat, lng: place.lng };
      const paths = await Promise.all(photos.map((p) => uploadPhoto(userId, p)));
      const item = await createItem({
        kind,
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        condition: kind === 'offer' ? form.condition : null,
        location,
        precise: !!(pinned || gps),
        city: place.name,
        areaLabel: form.neighborhood.trim() ? `${form.neighborhood.trim()}, ${place.name}` : place.name,
        address: kind === 'offer' ? form.address.trim() : '',
        pickupNotes: kind === 'offer' ? form.pickupNotes.trim() : '',
        communityId: form.communityId,
        photos: paths,
        aiAssisted: aiUsed,
      });
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['my-items'] });
      setForm({ ...EMPTY, city });
      setPhotos([]);
      setGps(null);
      setAi({ state: 'idle' });
      setAiUsed(false);
      touched.current.clear();
      router.push({ pathname: '/item/[id]', params: { id: item.id, fresh: '1' } });
    } catch (e) {
      setError((e as Error).message);
      if (Platform.OS !== 'web') Alert.alert('הפרסום נכשל', (e as Error).message);
    } finally {
      setPublishing(false);
    }
  }

  if (!userId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <EmptyState
          icon="gift-outline"
          title="יש לכם משהו שכבר לא צריך?"
          body="צלמו, ותוך דקה מישהו מהשכונה ישמח בו. צריך רק להתחבר."
          action={<Button title="התחברות" icon="log-in-outline" onPress={() => router.push('/sign-in')} />}
        />
      </SafeAreaView>
    );
  }

  const offer = kind === 'offer';

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: space.lg,
            gap: space.xl,
            paddingBottom: 120,
            maxWidth: 720,
            width: '100%',
            alignSelf: 'center',
          }}>
          <View style={{ gap: space.sm }}>
            <Text variant="title">{offer ? 'למסור משהו' : 'לבקש משהו'}</Text>
            <Text color={colors.muted}>
              {offer
                ? `היי ${profile?.display_name ?? ''}, צלמו את הפריט — ננסח לכם את המודעה אוטומטית ✨`
                : 'ספרו מה אתם מחפשים, ושכנים שיש להם יוכלו לפנות אליכם.'}
            </Text>
            <Segmented
              value={kind}
              onChange={setKind}
              options={[
                { value: 'offer', label: 'אני מוסר/ת' },
                { value: 'wanted', label: 'אני מחפש/ת' },
              ]}
            />
          </View>

          <View style={{ gap: space.sm }}>
            <Text variant="heading">{offer ? 'תמונות של הפריט (חובה)' : 'תמונות (לא חובה)'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {photos.length < MAX_PHOTOS && (
                <>
                  {Platform.OS !== 'web' && (
                    <PhotoButton icon="camera" label="צילום" onPress={() => addPhotos('camera')} />
                  )}
                  <PhotoButton icon="images" label="מהגלריה" onPress={() => addPhotos('library')} testID="add-photo" />
                </>
              )}
              {photos.map((p, i) => (
                <View key={p.uri} style={{ width: 96, height: 96, borderRadius: radius.md, overflow: 'hidden' }}>
                  <Image source={{ uri: p.uri }} style={{ flex: 1 }} contentFit="cover" />
                  {i === 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        start: 0,
                        end: 0,
                        backgroundColor: colors.overlay,
                        padding: 2,
                      }}>
                      <Text variant="caption" color={colors.white} style={{ textAlign: 'center' }}>
                        ראשית
                      </Text>
                    </View>
                  )}
                  <Pressable
                    accessibilityLabel="הסרת תמונה"
                    onPress={() => setPhotos((all) => all.filter((x) => x.uri !== p.uri))}
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
                </View>
              ))}
            </ScrollView>
            {offer && photos.length === 0 && (
              <Text variant="caption" color={colors.muted}>
                צלמו את הפריט עצמו — זו התמונה שכולם יראו, כדי שיידעו בדיוק מה מקבלים.
              </Text>
            )}
            <AiBanner state={ai.state} message={ai.message} onRetry={() => photos[0] && runAi(photos[0])} />
          </View>

          <Field
            testID="title-input"
            label={offer ? 'מה מוסרים?' : 'מה מחפשים?'}
            placeholder={offer ? 'שידה 3 מגירות' : 'עגלת תינוק'}
            value={form.title}
            onChangeText={(v) => set('title', v)}
            maxLength={80}
          />

          <View style={{ gap: space.sm }}>
            <Text variant="label" weight="bold">
              קטגוריה
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.id}
                  testID={`category-${c.id}`}
                  label={c.label}
                  icon={c.icon}
                  selected={form.category === c.id}
                  onPress={() => set('category', c.id)}
                />
              ))}
            </View>
          </View>

          {offer && (
            <View style={{ gap: space.sm }}>
              <Text variant="label" weight="bold">
                מצב
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {CONDITIONS.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.label}
                    selected={form.condition === c.id}
                    onPress={() => set('condition', c.id)}
                  />
                ))}
              </View>
            </View>
          )}

          <Field
            label="תיאור"
            placeholder={offer ? 'מידות, צבע, פגמים, צריך לפרק? יש מעלית?' : 'מידה, צבע, עד מתי צריך…'}
            multiline
            style={{ minHeight: 100 }}
            value={form.description}
            onChangeText={(v) => set('description', v)}
            maxLength={2000}
          />

          {offer && (
            <Field
              label="מתי נוח לאסוף?"
              placeholder="למשל: בערבים אחרי 18:00, או ליד הדלת"
              value={form.pickupNotes}
              onChangeText={(v) => set('pickupNotes', v)}
              maxLength={200}
            />
          )}

          <Card style={{ gap: space.md }}>
            <Row>
              <Ionicons name="location" size={20} color={colors.primary} />
              <Text variant="heading">{offer ? 'איפה אוספים?' : 'איפה אתם?'}</Text>
            </Row>
            <Button
              variant={gps ? 'secondary' : 'primary'}
              icon={gps ? 'checkmark-circle' : 'navigate'}
              title={gps ? 'המיקום נקלט' : offer ? 'הפריט נמצא כאן — השתמשו במיקום שלי' : 'השתמשו במיקום שלי'}
              onPress={useGps}
              loading={locating}
            />
            <Pressable
              testID="city-select"
              onPress={() => setPickerOpen(true)}
              style={{
                height: 48,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.card,
                paddingHorizontal: space.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Text color={city ? colors.ink : colors.faint}>{city ?? 'בחירת עיר'}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.muted} />
            </Pressable>
            <Field
              placeholder="שכונה (לא חובה) — למשל: הבורסה"
              value={form.neighborhood}
              onChangeText={(v) => set('neighborhood', v)}
              maxLength={40}
            />
            {offer && (
              <Field
                testID="address-input"
                label="כתובת לאיסוף"
                placeholder="רחוב ומספר בית"
                value={form.address}
                onChangeText={(v) => set('address', v)}
                maxLength={160}
                hint={
                  <Row style={{ alignItems: 'flex-start' }}>
                    <Ionicons name="lock-closed" size={13} color={colors.primary} style={{ marginTop: 2 }} />
                    <Text variant="caption" color={colors.muted} style={{ flex: 1 }}>
                      לא מוצגת לאף אחד. תישלח רק כשתלחצו ״שלח כתובת״ בצ׳אט — עם כפתור ניווט ב-Waze. במודעה רואים רק את
                      האזור.
                    </Text>
                  </Row>
                }
              />
            )}
          </Card>

          {communities.length > 0 && (
            <View style={{ gap: space.sm }}>
              <Text variant="label" weight="bold">
                למי להציג?
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                <Chip
                  label="כל השכנים"
                  icon="globe-outline"
                  selected={!form.communityId}
                  onPress={() => set('communityId', null)}
                />
                {communities.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    icon={c.is_private ? 'lock-closed-outline' : 'people-outline'}
                    selected={form.communityId === c.id}
                    onPress={() => set('communityId', c.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {error && (
            <Text color={colors.danger} testID="post-error">
              {error}
            </Text>
          )}
          <Button
            testID="publish"
            size="lg"
            icon={offer ? 'gift' : 'megaphone'}
            title={publishing ? 'מפרסם…' : offer ? 'פרסום למסירה' : 'פרסום הבקשה'}
            onPress={publish}
            loading={publishing}
            disabled={ai.state === 'blocked'}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <CityPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onPick={(name) => set('city', name)} />
    </SafeAreaView>
  );
}

function PhotoButton({
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
      style={({ pressed }) => ({
        width: 96,
        height: 96,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.primary,
        backgroundColor: pressed ? colors.primarySoft : colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
      })}>
      <Ionicons name={icon} size={26} color={colors.primary} />
      <Text variant="caption" weight="bold" color={colors.primary}>
        {label}
      </Text>
    </Pressable>
  );
}

function AiBanner({
  state,
  message,
  onRetry,
}: {
  state: 'idle' | 'working' | 'done' | 'blocked' | 'error';
  message?: string;
  onRetry: () => void;
}) {
  if (state === 'idle') return null;
  const tone =
    state === 'blocked'
      ? { bg: colors.dangerSoft, fg: colors.danger }
      : state === 'error'
        ? { bg: colors.warningSoft, fg: colors.warning }
        : { bg: colors.primarySoft, fg: colors.primaryDark };
  return (
    <View
      testID="ai-banner"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        padding: space.md,
        borderRadius: radius.md,
        backgroundColor: tone.bg,
      }}>
      {state === 'working' ? (
        <ActivityIndicator color={tone.fg} />
      ) : (
        <Ionicons
          name={state === 'done' ? 'sparkles' : state === 'blocked' ? 'alert-circle' : 'information-circle'}
          size={20}
          color={tone.fg}
        />
      )}
      <Text variant="label" color={tone.fg} style={{ flex: 1 }}>
        {state === 'working'
          ? 'מזהה את הפריט ומנסח מודעה…'
          : state === 'done'
            ? 'ניסחנו בשבילכם — אפשר לערוך הכל'
            : state === 'blocked'
              ? message
              : `${message ?? 'המילוי האוטומטי לא הצליח'} — אפשר למלא ידנית`}
      </Text>
      {state === 'error' && <Button size="sm" variant="light" title="שוב" onPress={onRetry} />}
    </View>
  );
}
