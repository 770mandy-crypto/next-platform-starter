import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CITIES } from '@/lib/catalog';
import { matches } from '@/lib/search';
import { colors, space } from '@/theme';

import { Button, Divider, Field, Row, Text } from './ui';

export function CityPicker({
  visible,
  onClose,
  onPick,
  onUseGps,
  locating,
  error,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (name: string) => void;
  onUseGps?: () => void;
  locating?: boolean;
  error?: string | null;
}) {
  const [query, setQuery] = useState('');
  const list = useMemo(() => CITIES.filter((c) => !query || matches(c.name, query)), [query]);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Row style={{ padding: space.lg, justifyContent: 'space-between' }}>
          <Text variant="title">איפה לחפש?</Text>
          <Pressable accessibilityLabel="סגירה" onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={26} color={colors.ink} />
          </Pressable>
        </Row>
        <View style={{ paddingHorizontal: space.lg, gap: space.md }}>
          {onUseGps && <Button icon="navigate" title="לפי המיקום הנוכחי שלי" onPress={onUseGps} loading={locating} />}
          {error && (
            <Text variant="caption" color={colors.danger}>
              {error}
            </Text>
          )}
          <Field placeholder="חיפוש עיר…" value={query} onChangeText={setQuery} autoFocus={!onUseGps} />
        </View>
        <FlatList
          style={{ marginTop: space.md }}
          data={list}
          keyExtractor={(c) => c.name}
          ItemSeparatorComponent={Divider}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onPick(item.name);
                onClose();
              }}
              style={({ pressed }) => ({
                paddingVertical: 14,
                paddingHorizontal: space.lg,
                backgroundColor: pressed ? colors.primarySoft : colors.card,
              })}>
              <Text>{item.name}</Text>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}
