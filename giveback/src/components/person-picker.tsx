import { Modal, Pressable, View } from 'react-native';

import type { Conversation } from '@/lib/types';
import { colors, radius, space } from '@/theme';

import { Avatar, Button, Text } from './ui';

// "Who gets it?" — the Buy Nothing idea: the giver chooses among everyone who
// asked, rather than first-come-first-served.
export function PersonPicker({
  visible,
  title,
  people,
  onPick,
  onClose,
  allowNone,
}: {
  visible: boolean;
  title: string;
  people: Conversation[];
  onPick: (userId: string | null) => void;
  onClose: () => void;
  allowNone?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            padding: space.xl,
            gap: space.md,
            maxWidth: 560,
            width: '100%',
            alignSelf: 'center',
          }}>
          <Text variant="title">{title}</Text>
          {people.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => onPick(p.other_id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                padding: space.md,
                borderRadius: radius.md,
                backgroundColor: pressed ? colors.primarySoft : colors.bg,
              })}>
              <Avatar uri={p.other_avatar} name={p.other_name} />
              <View style={{ flex: 1 }}>
                <Text weight="bold">{p.other_name}</Text>
                <Text variant="caption" color={colors.muted} numberOfLines={1}>
                  {p.last_message_preview}
                </Text>
              </View>
            </Pressable>
          ))}
          {allowNone && <Button variant="ghost" title={allowNone} onPress={() => onPick(null)} />}
          <Button variant="ghost" title="ביטול" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
