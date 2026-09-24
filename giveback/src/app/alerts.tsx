import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button, Card, Chip, Field, IconButton, Row, Text } from '@/components/ui';
import { createAlert, deleteAlert, listAlerts } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CATEGORIES, category, RADII } from '@/lib/catalog';
import { useOrigin } from '@/lib/location';
import { colors, space } from '@/theme';

// Saved searches, like Olio's "notify me": a push the moment a matching item
// is posted nearby.
export default function Alerts() {
  const params = useLocalSearchParams<{ query?: string; category?: string }>();
  const { userId } = useAuth();
  const { origin, locate, locating } = useOrigin();
  const [query, setQuery] = useState(params.query ?? '');
  const [cat, setCat] = useState<string | null>(params.category || null);
  const [radiusKm, setRadiusKm] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: alerts = [], refetch } = useQuery({ queryKey: ['alerts'], queryFn: listAlerts, enabled: !!userId });

  async function save() {
    if (!userId || !origin) return;
    if (!query.trim() && !cat) return setError('כתבו מה לחפש או בחרו קטגוריה');
    setBusy(true);
    setError(null);
    try {
      await createAlert(userId, {
        query,
        category: cat,
        radiusKm,
        center: origin,
        label: [query.trim(), cat ? category(cat).label : null].filter(Boolean).join(' · '),
      });
      setQuery('');
      setCat(null);
      refetch();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: space.lg, gap: space.xl, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
      <Card style={{ gap: space.md }}>
        <Row>
          <Ionicons name="notifications" size={20} color={colors.primary} />
          <Text variant="heading">התראה חדשה</Text>
        </Row>
        <Field
          testID="alert-query"
          placeholder="למשל: עגלה, מיטת תינוק, ספרי הארי פוטר"
          value={query}
          onChangeText={setQuery}
          maxLength={60}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              label={c.label}
              selected={cat === c.id}
              onPress={() => setCat(cat === c.id ? null : c.id)}
            />
          ))}
        </View>
        <Text variant="label" weight="bold">
          במרחק של עד
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {RADII.map((r) => (
            <Chip key={r} label={`${r} ק״מ`} selected={radiusKm === r} onPress={() => setRadiusKm(r)} />
          ))}
        </View>
        {origin ? (
          <Text variant="caption" color={colors.muted}>
            ממרכז: {origin.label}
          </Text>
        ) : (
          <Button variant="secondary" icon="navigate" title="קודם — המיקום שלי" onPress={locate} loading={locating} />
        )}
        {error && <Text color={colors.danger}>{error}</Text>}
        <Button testID="save-alert" title="שמירת ההתראה" onPress={save} loading={busy} disabled={!origin} />
      </Card>

      <View style={{ gap: space.md }}>
        <Text variant="heading">ההתראות שלי</Text>
        {alerts.length === 0 && <Text color={colors.muted}>אין עדיין התראות.</Text>}
        {alerts.map((a) => (
          <Card key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Ionicons name="notifications-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text weight="bold">{a.label || a.query || category(a.category ?? '').label}</Text>
              <Text variant="caption" color={colors.muted}>
                עד {a.radius_km} ק״מ
              </Text>
            </View>
            <IconButton
              icon="trash-outline"
              label="מחיקה"
              color={colors.danger}
              onPress={() => deleteAlert(a.id).then(() => refetch())}
            />
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}
