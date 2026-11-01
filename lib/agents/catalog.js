// The subagents you can chat with on the site, as the picker and the chat
// header show them. This file is safe to ship to the browser; the system
// prompts live server-side in prompts.js.
//
// The ids match the Claude Code subagents in .claude/agents/, so the same
// names work in a Claude Code session and on the site.

export const AGENTS = [
    {
        id: 'security-auditor',
        label: 'אבטחה',
        summary: 'מוצא חולשות אבטחה בקוד ובהגדרות שלך ומסביר איך לתקן. בדיקה הגנתית של מערכות שבבעלותך.',
        example: 'הנה ה-API route שלי להתחברות. יש בו בעיות אבטחה?',
        dot: 'bg-rose-500',
        tint: 'bg-rose-50 text-rose-700 ring-rose-200'
    },
    {
        id: 'bug-hunter',
        label: 'באגים',
        summary: 'מוצא באגים אמיתיים ושגיאות לוגיקה, עם תרחיש כשל קונקרטי ותיקון מינימלי.',
        example: 'הפונקציה הזו מחזירה לפעמים תוצאה שגויה. תמצא למה.',
        dot: 'bg-amber-500',
        tint: 'bg-amber-50 text-amber-800 ring-amber-200'
    },
    {
        id: 'researcher',
        label: 'מחקר',
        summary: 'מחפש ברשת, משווה אפשרויות ומסכם מה ידוע ומה שנוי במחלוקת, עם קישורים למקורות.',
        example: 'מה ההבדל היום בין Netlify ל-Vercel לאתר Next.js?',
        dot: 'bg-blue-500',
        tint: 'bg-blue-50 text-blue-700 ring-blue-200'
    },
    {
        id: 'deep-analyst',
        label: 'ניתוח לעומק',
        summary: 'צולל לבעיה אחת מורכבת ומסביר את המנגנון האמיתי, צעד אחר צעד.',
        example: 'תסביר לעומק איך עובד ה-rate limiting בקוד הזה.',
        dot: 'bg-violet-500',
        tint: 'bg-violet-50 text-violet-700 ring-violet-200'
    },
    {
        id: 'code-reviewer',
        label: 'סקירת קוד',
        summary: 'סוקר שינויים ונותן ביקורת מדורגת: מה חובה לתקן, מה כדאי, ומה ליטוש.',
        example: 'תעשה code review ל-diff הזה.',
        dot: 'bg-teal-500',
        tint: 'bg-teal-50 text-teal-700 ring-teal-200'
    },
    {
        id: 'test-writer',
        label: 'טסטים',
        summary: 'כותב טסטים אוטומטיים למקרה הרגיל, למקרי קצה ולרגרסיה, בסגנון של הפרויקט.',
        example: 'תכתוב טסטים ל-node:test לפונקציה הזו.',
        dot: 'bg-green-500',
        tint: 'bg-green-50 text-green-700 ring-green-200'
    },
    {
        id: 'documenter',
        label: 'תיעוד',
        summary: 'כותב ומשפר תיעוד: README, הערות ומדריכי שימוש, מבוסס על הקוד עצמו.',
        example: 'תכתוב README קצר למודול הזה.',
        dot: 'bg-slate-500',
        tint: 'bg-slate-100 text-slate-700 ring-slate-200'
    },
    {
        id: 'morning-brief',
        label: 'תדריך בוקר',
        summary: 'עוזר אישי לתכנון היום: מסדר משימות, מנסח תדריך בוקר קצר ומתעדף. עובד ממה שתדביק — יומן, מיילים, רשימות.',
        example: 'הנה האירועים והמשימות שלי להיום — תסדר לי תדריך בוקר קצר.',
        dot: 'bg-orange-500',
        tint: 'bg-orange-50 text-orange-700 ring-orange-200'
    },
    {
        id: 'email-triage',
        label: 'מיילים חשובים',
        summary: 'ממיין מיילים: מה באמת חשוב/דחוף, מה פרסומת, ומה דורש תשובה. הדביקו את המיילים.',
        example: 'הדבקתי כמה מיילים — מה חשוב פה ועל מה צריך לענות?',
        dot: 'bg-yellow-500',
        tint: 'bg-yellow-50 text-yellow-800 ring-yellow-200'
    },
    {
        id: 'meeting-summarizer',
        label: 'סיכום פגישות',
        summary: 'מקבל תמליל או הערות מפגישה ומחזיר סיכום תמציתי: נקודות עיקריות, החלטות ומשימות למעקב.',
        example: 'הנה תמליל הפגישה — תסכם נקודות, החלטות ומשימות.',
        dot: 'bg-cyan-500',
        tint: 'bg-cyan-50 text-cyan-700 ring-cyan-200'
    },
    {
        id: 'drive-organizer',
        label: 'גיבוי וארגון',
        summary: 'עוזר להחליט מה חשוב לגבות, איך לארגן קבצים ותיקיות, ולבנות שגרת גיבוי פשוטה.',
        example: 'יש לי המון קבצים בדרייב בלי סדר — איך כדאי לארגן ומה לגבות?',
        dot: 'bg-sky-500',
        tint: 'bg-sky-50 text-sky-700 ring-sky-200'
    },
    {
        id: 'weekly-review',
        label: 'סיכום שבועי',
        summary: 'עוזר לסכם את השבוע שעבר ולתכנן את הקרוב: מה נעשה, מה פתוח, ומה דורש מעקב.',
        example: 'הנה מה שעשיתי השבוע — תעזור לי לסכם ולתכנן את השבוע הבא.',
        dot: 'bg-fuchsia-500',
        tint: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200'
    },
    {
        id: 'ai-news',
        label: 'חדשות AI',
        summary: 'מחפש ברשת ומסכם את החדשות החשובות בעולם ה-AI מהתקופה האחרונה, עם קישורים למקורות.',
        example: 'מה החדשות הכי חשובות בעולם ה-AI מהשבוע?',
        dot: 'bg-emerald-500',
        tint: 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    }
];

export const AGENT_IDS = AGENTS.map((agent) => agent.id);

export function getAgent(id) {
    return AGENTS.find((agent) => agent.id === id) ?? null;
}
