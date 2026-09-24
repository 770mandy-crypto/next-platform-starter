import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listConversations } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, fonts, shadow } from '@/theme';

export default function TabsLayout() {
  const { userId } = useAuth();
  const insets = useSafeAreaInsets();
  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: listConversations,
    enabled: !!userId,
  });
  const unread = conversations?.reduce((sum, c) => sum + c.unread, 0) ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15 },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 68 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'גילוי',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'מפה',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'למסור',
          tabBarButtonTestID: 'tab-post',
          tabBarIcon: () => (
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                marginTop: -14,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                ...shadow,
              }}>
              <Ionicons name="add" size={30} color={colors.white} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'הודעות',
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent, fontFamily: fonts.bold, fontSize: 11 },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'פרופיל',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
