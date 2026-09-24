import { useQuery } from '@tanstack/react-query';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { ItemCard } from '@/components/item-card';
import { EmptyState, Loading } from '@/components/ui';
import { listFavorites } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { space } from '@/theme';

export default function Favorites() {
  const { userId } = useAuth();
  const { width } = useWindowDimensions();
  const cardWidth = (Math.min(width, 760) - space.lg * 2 - space.md) / 2;
  const { data, isLoading } = useQuery({
    queryKey: ['favorites', userId],
    queryFn: () => listFavorites(userId!),
    enabled: !!userId,
  });
  if (isLoading) return <Loading />;
  if (!data?.length)
    return <EmptyState icon="heart-outline" title="אין פריטים שמורים" body="לחצו על ♡ בפריט כדי לחזור אליו אחר כך." />;
  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {data.map((item) => (
          <ItemCard key={item.id} item={item} width={cardWidth} />
        ))}
      </View>
    </ScrollView>
  );
}
