import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';

import { CityPicker } from '@/components/city-picker';
import { Button, Card, Chip, Field, Row, Text } from '@/components/ui';
import { createCommunity } from '@/lib/api';
import { CITIES, COMMUNITY_KINDS } from '@/lib/catalog';
import { nearestCity } from '@/lib/geo';
import { getGpsFix, useOrigin } from '@/lib/location';
import { colors, space } from '@/theme';

export default function NewCommunity() {
  // With ?parent= this creates a community inside another one (a building
  // inside a neighbourhood); it then inherits the parent's location.
  const { parent, parentName } = useLocalSearchParams<{ parent?: string; parentName?: string }>();
  const { origin } = useOrigin();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<string>('building');
  const [isPrivate, setIsPrivate] = useState(!parent);
  const [city, setCity] = useState<string | null>(origin ? nearestCity(origin).name : null);
  const [point, setPoint] = useState(origin ? { lat: origin.lat, lng: origin.lng } : null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (name.trim().length < 2) return setError('תנו שם לקהילה');
    let where = point;
    let cityName = city;
    if (!parent && !where) {
      try {
        where = await getGpsFix();
        cityName = nearestCity(where).name;
      } catch {
        const c = CITIES.find((x) => x.name === city);
        if (!c) return setError('בחרו עיר');
        where = { lat: c.lat, lng: c.lng };
      }
    }
    setBusy(true);
    try {
      const created = await createCommunity({
        name: name.trim(),
        description: description.trim(),
        kind,
        city: parent ? null : (cityName ?? ''),
        point: parent ? null : where,
        isPrivate,
        parentId: parent ?? null,
      });
      router.replace(`/communities/${created.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: space.lg, gap: space.xl, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <Stack.Screen options={{ title: parent ? `קהילה בתוך ${parentName ?? ''}` : 'קהילה חדשה' }} />
      {parent && (
        <Text color={colors.muted}>
          הקהילה החדשה תהיה חלק מ{parentName}. רק מי שנמצא/ת ב{parentName} יוכל/תוכל לראות אותה.
        </Text>
      )}
      <Field
        testID="community-name"
        label="שם הקהילה"
        placeholder={parent ? 'בניין הרצל 12 / גן החצב / חוג שחמט' : 'בניין הרצל 12 / גן החצב / שכונת נווה עוז'}
        value={name}
        onChangeText={setName}
        maxLength={60}
      />
      <View style={{ gap: space.sm }}>
        <Text variant="label" weight="bold">
          סוג
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {COMMUNITY_KINDS.map((k) => (
            <Chip key={k.id} label={k.label} selected={kind === k.id} onPress={() => setKind(k.id)} />
          ))}
        </View>
      </View>
      <Field
        label="תיאור (לא חובה)"
        multiline
        style={{ minHeight: 80 }}
        value={description}
        onChangeText={setDescription}
        maxLength={500}
      />
      <Card style={{ gap: space.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text weight="bold">קהילה פרטית</Text>
            <Text variant="caption" color={colors.muted}>
              מצטרפים רק עם קוד הזמנה, והפריטים נראים רק לחברים.
            </Text>
          </View>
          <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ true: colors.primary }} />
        </Row>
      </Card>
      {!parent && (
        <Button
          variant="ghost"
          icon="location-outline"
          title={city ?? 'בחירת עיר'}
          onPress={() => setPickerOpen(true)}
        />
      )}
      {error && <Text color={colors.danger}>{error}</Text>}
      <Button testID="create-community" size="lg" title="יצירת הקהילה" onPress={submit} loading={busy} />
      <CityPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(n) => {
          setCity(n);
          const c = CITIES.find((x) => x.name === n)!;
          setPoint({ lat: c.lat, lng: c.lng });
        }}
      />
    </ScrollView>
  );
}
