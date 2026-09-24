import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ItemsMap } from '@/components/items-map';
import { Button, EmptyState, Loading, Row, Text } from '@/components/ui';
import { searchItems } from '@/lib/api';
import { CITIES } from '@/lib/catalog';
import { useOrigin } from '@/lib/location';
import { colors, space } from '@/theme';

export default function MapTab() {
  const { origin, locate, locating } = useOrigin();
  const center = origin ?? { lat: CITIES[1].lat, lng: CITIES[1].lng };
  const { data, isLoading } = useQuery({
    queryKey: ['map', center.lat, center.lng],
    queryFn: () => searchItems({ origin: center, radiusKm: 15, query: '', category: null, kind: 'offer' }, 0, 200),
  });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Row style={{ paddingHorizontal: space.lg, paddingVertical: space.md, justifyContent: 'space-between' }}>
        <View>
          <Text variant="title">מה יש בסביבה</Text>
          <Text variant="caption" color={colors.muted}>
            {data ? `${data.length} פריטים עד 15 ק״מ` : ' '} · הנקודות מקורבות לשמירה על פרטיות
          </Text>
        </View>
        {!origin && <Button size="sm" icon="navigate" title="המיקום שלי" onPress={locate} loading={locating} />}
      </Row>
      {isLoading ? (
        <Loading />
      ) : data && data.length > 0 ? (
        <ItemsMap items={data} center={center} />
      ) : (
        <EmptyState icon="map-outline" title="עוד אין פריטים באזור" body="כשמשהו יתפרסם קרוב — הוא יופיע כאן." />
      )}
    </SafeAreaView>
  );
}
