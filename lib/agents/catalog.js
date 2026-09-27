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
    }
];

export const AGENT_IDS = AGENTS.map((agent) => agent.id);

export function getAgent(id) {
    return AGENTS.find((agent) => agent.id === id) ?? null;
}
