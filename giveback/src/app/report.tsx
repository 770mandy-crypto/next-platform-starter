import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button, Chip, Field, Text } from '@/components/ui';
import { blockUser, report } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { REPORT_REASONS } from '@/lib/catalog';
import { goBack } from '@/lib/nav';
import { colors, space } from '@/theme';

export default function Report() {
  const {
    itemId,
    userId: reportedId,
    conversationId,
  } = useLocalSearchParams<{
    itemId?: string;
    userId?: string;
    conversationId?: string;
  }>();
  const { userId } = useAuth();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!reason) return;
    setBusy(true);
    setError(null);
    try {
      await report({ reason, details, itemId, userId: reportedId, conversationId });
      if (alsoBlock && reportedId && userId) await blockUser(userId, reportedId);
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <View style={{ padding: space.xl, gap: space.lg, alignItems: 'center' }}>
        <Text variant="title">תודה על הדיווח 🙏</Text>
        <Text color={colors.muted} style={{ textAlign: 'center' }}>
          צוות GiveBack יבדוק תוך 24 שעות. הקהילה בטוחה יותר בזכותך.
        </Text>
        <Button title="סגירה" onPress={() => goBack()} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: space.lg, gap: space.lg, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <Text variant="heading">מה קרה?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {REPORT_REASONS.map((r) => (
          <Chip key={r.id} label={r.label} selected={reason === r.id} onPress={() => setReason(r.id)} />
        ))}
      </View>
      <Field
        label="פרטים (לא חובה)"
        multiline
        style={{ minHeight: 90 }}
        value={details}
        onChangeText={setDetails}
        maxLength={1000}
      />
      {reportedId && (
        <Chip
          label="לחסום גם את המשתמש/ת"
          icon={alsoBlock ? 'checkbox' : 'square-outline'}
          selected={alsoBlock}
          onPress={() => setAlsoBlock(!alsoBlock)}
        />
      )}
      {error && <Text color={colors.danger}>{error}</Text>}
      <Button title="שליחת דיווח" onPress={submit} loading={busy} disabled={!reason} />
    </ScrollView>
  );
}
