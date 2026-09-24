import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CityPicker } from '@/components/city-picker';
import { Avatar, Button, Card, Field, Row, Text } from '@/components/ui';
import { joinCommunity, listCommunities, updateProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDistance } from '@/lib/geo';
import { useOrigin } from '@/lib/location';
import { colors, space } from '@/theme';

export default function Onboarding() {
  const { profile, userId, refreshProfile } = useAuth();
  const { origin, locate, chooseCity, locating, error: locError } = useOrigin();
  const queryClient = useQueryClient();
  const [typedName, setName] = useState<string | null>(null);
  const name = typedName ?? profile?.display_name ?? '';
  const [pickerOpen, setPickerOpen] = useState(false);
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: communities = [] } = useQuery({
    queryKey: ['communities', 'onboarding', origin?.lat, origin?.lng],
    queryFn: async () => (await listCommunities(origin)).filter((c) => !c.is_private).slice(0, 5),
    enabled: !!origin,
  });

  async function toggle(id: string) {
    try {
      await joinCommunity(id);
      setJoined((s) => new Set(s).add(id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function finish() {
    if (!userId) return;
    if (name.trim().length < 2) return setError('השם קצר מדי');
    setSaving(true);
    try {
      await updateProfile(userId, {
        display_name: name.trim(),
        city: origin?.label.replace(/^ליד /, '') ?? null,
        onboarded: true,
      });
      await refreshProfile();
      queryClient.invalidateQueries();
      router.replace('/');
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: space.xl, gap: space.xl, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <View style={{ alignItems: 'center', gap: space.sm }}>
          <Avatar uri={profile?.avatar_url} name={name} size={80} />
          <Text variant="display" style={{ textAlign: 'center' }}>
            נעים להכיר!
          </Text>
          <Text color={colors.muted} style={{ textAlign: 'center' }}>
            שני דברים קטנים, ואפשר להתחיל.
          </Text>
        </View>

        <Field
          testID="onboarding-name"
          label="איך יקראו לך השכנים?"
          value={name}
          onChangeText={setName}
          maxLength={40}
          hint="שם פרטי מספיק. זה מה שיופיע בצ׳אט ובמודעות."
        />

        <Card style={{ gap: space.md }}>
          <Row>
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text variant="heading">איפה את/ה גר/ה?</Text>
          </Row>
          <Text variant="caption" color={colors.muted}>
            כדי להראות קודם את מה שהכי קרוב. המיקום לא מוצג לאף אחד.
          </Text>
          {origin ? (
            <Row style={{ justifyContent: 'space-between' }}>
              <Text weight="bold">📍 {origin.label}</Text>
              <Button size="sm" variant="ghost" title="שינוי" onPress={() => setPickerOpen(true)} />
            </Row>
          ) : (
            <Row>
              <Button style={{ flex: 1 }} icon="navigate" title="המיקום שלי" onPress={locate} loading={locating} />
              <Button style={{ flex: 1 }} variant="ghost" title="בחירת עיר" onPress={() => setPickerOpen(true)} />
            </Row>
          )}
          {locError && (
            <Text variant="caption" color={colors.danger}>
              {locError}
            </Text>
          )}
        </Card>

        {communities.length > 0 && (
          <View style={{ gap: space.md }}>
            <Text variant="heading">קהילות בסביבה</Text>
            {communities.map((c) => (
              <Card key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View style={{ flex: 1 }}>
                  <Text weight="bold">{c.name}</Text>
                  <Text variant="caption" color={colors.muted}>
                    {c.member_count} חברים · {formatDistance(c.distance_km)}
                  </Text>
                </View>
                <Button
                  size="sm"
                  variant={joined.has(c.id) || c.is_member ? 'secondary' : 'primary'}
                  title={joined.has(c.id) || c.is_member ? 'הצטרפת ✓' : 'הצטרפות'}
                  disabled={joined.has(c.id) || c.is_member}
                  onPress={() => toggle(c.id)}
                />
              </Card>
            ))}
          </View>
        )}

        {error && <Text color={colors.danger}>{error}</Text>}
        <Button testID="onboarding-done" size="lg" title="בואו נתחיל" onPress={finish} loading={saving} />
      </ScrollView>
      <CityPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onPick={chooseCity} />
    </SafeAreaView>
  );
}
