import { View } from 'react-native';

import type { Profile, ProfileStats } from '@/lib/types';
import { colors, space } from '@/theme';

import { Avatar, Card, Text } from './ui';

export function ProfileHeader({ profile, stats }: { profile: Profile; stats?: ProfileStats }) {
  const since = new Date(profile.created_at).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  return (
    <View style={{ gap: space.lg }}>
      <View style={{ alignItems: 'center', gap: space.sm }}>
        <Avatar uri={profile.avatar_url} name={profile.display_name} size={84} />
        <Text variant="title">{profile.display_name}</Text>
        <Text variant="caption" color={colors.muted}>
          {profile.city ? `${profile.city} · ` : ''}ב-GiveBack מאז {since}
        </Text>
        {!!profile.bio && <Text style={{ textAlign: 'center' }}>{profile.bio}</Text>}
      </View>
      {stats && (
        <Card style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: space.md }}>
          <Stat value={stats.given_count} label="מסר/ה" />
          <Stat value={stats.received_count} label="קיבל/ה" />
          <Stat value={stats.thanks_count} label="תודות 💚" />
        </Card>
      )}
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text variant="title" color={colors.primary}>
        {value}
      </Text>
      <Text variant="caption" color={colors.muted}>
        {label}
      </Text>
    </View>
  );
}
