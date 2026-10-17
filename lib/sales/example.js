// The MVP's example business. Fictional: every name, price and policy here is
// sample data for testing, to be replaced with the real business's details.

const weekday = [{ start: '08:00', end: '19:00' }];

export const EXAMPLE_BUSINESS = {
    name: 'קליניקת תנועה (דוגמה)',
    industry: 'פיזיותרפיה',
    country: 'IL',
    timezone: 'Asia/Jerusalem',
    language: 'he-IL',
    agent_name: 'נועה',
    tone: 'חמה, מקצועית ותמציתית. פונה בגוף שני, בלי סלנג.',
    target_audience: 'מבוגרים עם כאבי גב, צוואר וברכיים, ספורטאים חובבים אחרי פציעה',
    sales_goal: 'meeting',
    business_hours: { 0: weekday, 1: weekday, 2: weekday, 3: weekday, 4: weekday, 5: [{ start: '08:00', end: '13:00' }] },
    appointment_minutes: 45,
    contact_email: '',
    handoff_rules: 'להעביר לנציג כשהלקוח מבקש, כשיש כאב חריף או שאלה רפואית, או כשהלקוח כועס.',
    calling_window: { start: '09:00', end: '20:00', days: [0, 1, 2, 3, 4] },
    max_calls_per_hour: 10,
    max_attempts_per_lead: 2,
    store_transcripts: true,
    retention_days: 90
};

export const EXAMPLE_KNOWLEDGE = [
    {
        kind: 'service',
        title: 'טיפול פיזיותרפיה פרטני',
        content: 'טיפול של 45 דקות עם פיזיותרפיסט מוסמך: אבחון, טיפול ידני ותוכנית תרגילים לבית.',
        price: 280,
        currency: 'ILS',
        verified: true
    },
    {
        kind: 'service',
        title: 'אבחון ראשוני',
        content: 'פגישת היכרות ואבחון של 45 דקות. כולל המלצה על מספר טיפולים.',
        price: 220,
        currency: 'ILS',
        verified: true
    },
    {
        kind: 'promotion',
        title: 'כרטיסייה של 5 טיפולים',
        content: '5 טיפולים פרטניים במחיר מוזל, בתוקף 4 חודשים מהטיפול הראשון.',
        price: 1250,
        currency: 'ILS',
        verified: true
    },
    {
        kind: 'policy',
        title: 'ביטול ושינוי תור',
        content: 'אפשר לבטל או לשנות תור עד 24 שעות מראש ללא חיוב. ביטול מאוחר יותר מחויב במחצית ממחיר הטיפול.',
        verified: true
    },
    {
        kind: 'faq',
        title: 'קופות חולים וביטוחים',
        content:
            'הקליניקה פרטית ואינה בהסדר עם קופות חולים. אנחנו מוציאים קבלה שאפשר להגיש לביטוח משלים או פרטי לפי תנאי הפוליסה של הלקוח.',
        verified: true
    },
    {
        kind: 'faq',
        title: 'מיקום וחניה',
        content: 'הקליניקה ברחוב הדוגמה 10, תל אביב, קומה 2 עם מעלית. יש חניון ציבורי בבניין הסמוך.',
        verified: true
    },
    {
        kind: 'other',
        title: 'טיפול בהידרותרפיה',
        content: 'בבדיקה — עדיין לא מאושר למכירה.',
        verified: false
    }
];
