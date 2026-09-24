import { ScrollView } from 'react-native';

import { Text } from '@/components/ui';
import { AI_ENABLED } from '@/lib/features';
import { space } from '@/theme';

// Plain-language summary. Have a lawyer review before launch; the stores also
// require this text at a public URL.
const SECTIONS: [string, string][] = [
  [
    'מה אנחנו שומרים',
    'שם, תמונת פרופיל ואימייל מחשבון Google / Apple או מהאימייל שהזנת; הפריטים שפרסמת ותמונותיהם; ההודעות שלך; ומיקום משוער שבחרת לשתף.',
  ],
  [
    'המיקום והכתובת שלך',
    'הכתובת המדויקת לעולם לא מוצגת במודעה. אחרים רואים רק אזור (בסטייה של כמה מאות מטרים). הכתובת נשלחת רק כשאת/ה בוחר/ת לשלוח אותה בצ׳אט לאדם מסוים.',
  ],
  ...(AI_ENABLED
    ? ([
        [
          'בינה מלאכותית',
          'כשמוסיפים תמונה לפרסום, היא נשלחת לשירות Claude של Anthropic כדי לנסח את המודעה ולבדוק שהפריט מותר. התמונה לא משמשת לאימון מודלים.',
        ],
      ] as [string, string][])
    : []),
  [
    'התראות',
    'אנחנו שולחים התראות על הודעות, על פריטים שמתאימים להתראות החיפוש שלך ועל תודות. אפשר לכבות בהגדרות הטלפון.',
  ],
  ['מי רואה מה', 'פרופיל, פריטים ותודות — ציבוריים (או לחברי הקהילה, בקהילה פרטית). הודעות — רק לשני הצדדים בשיחה.'],
  ['מחיקה', 'אפשר למחוק את החשבון בכל רגע מתוך מסך הפרופיל. כל הפריטים, התמונות וההודעות שלך יימחקו לצמיתות.'],
  ['יצירת קשר', 'לכל שאלה: privacy@giveback.co.il'],
];

export default function Privacy() {
  return (
    <ScrollView
      contentContainerStyle={{ padding: space.lg, gap: space.md, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      {SECTIONS.map(([title, body]) => (
        <Text key={title}>
          <Text weight="bold">{title}. </Text>
          {body}
        </Text>
      ))}
    </ScrollView>
  );
}
