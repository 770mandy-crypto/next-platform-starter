import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { Avatar, Button, Field, Text } from '@/components/ui';
import { updateProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, space } from '@/theme';

export default function EditProfile() {
  const { profile, userId, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!userId) return;
    setBusy(true);
    setError(null);
    try {
      await updateProfile(userId, { display_name: name.trim(), bio: bio.trim(), city: city.trim() || null });
      await refreshProfile();
      router.back();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: space.lg, gap: space.lg, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <Avatar uri={profile?.avatar_url} name={name} size={80} />
      <Field label="שם" value={name} onChangeText={setName} maxLength={40} />
      <Field label="עיר" value={city} onChangeText={setCity} maxLength={40} />
      <Field
        label="קצת עליי"
        multiline
        style={{ minHeight: 90 }}
        value={bio}
        onChangeText={setBio}
        maxLength={300}
        hint="למשל: אמא לשלושה, אוהבת למסור ספרים 📚"
      />
      {error && <Text color={colors.danger}>{error}</Text>}
      <Button title="שמירה" onPress={save} loading={busy} disabled={name.trim().length < 2} />
    </ScrollView>
  );
}
