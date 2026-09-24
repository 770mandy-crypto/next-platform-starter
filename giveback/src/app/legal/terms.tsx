import { ScrollView } from 'react-native';

import { Text } from '@/components/ui';
import { space } from '@/theme';

const RULES: string[] = [
  'GiveBack נועדה למסירה בחינם בלבד. אסור לבקש כסף תמורת פריט.',
  'אסור לפרסם: נשק ותחמושת, תרופות, אלכוהול, טבק וסיגריות אלקטרוניות, סמים, בעלי חיים, תוכן למבוגרים ומוצרים מזויפים.',
  'מושבי בטיחות לרכב וקסדות — רק אם לא עברו תאונה ובתוקף.',
  'אוכל — רק סגור באריזה המקורית ובתוקף, או תוצרת ביתית שמתאימה לשיתוף.',
  'פוגשים שכנים — עדיף באור יום, בכניסה לבניין או במקום ציבורי.',
  'המוסר/ת והמקבל/ת אחראים לפריט ולמצבו. GiveBack היא פלטפורמה לחיבור בין שכנים ואינה צד להעברה.',
  'משתמשים שיפרו את הכללים עלולים להיחסם.',
];

export default function Terms() {
  return (
    <ScrollView
      contentContainerStyle={{ padding: space.lg, gap: space.md, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      {RULES.map((r, i) => (
        <Text key={i}>
          {i + 1}. {r}
        </Text>
      ))}
    </ScrollView>
  );
}
