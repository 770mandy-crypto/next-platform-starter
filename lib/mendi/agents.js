// MENDI AI's team, as the command room shows it. Safe to ship to the browser:
// the system prompts and tools live server-side (prompts.js, tools.js).
//
// `needs` names the connectors (see connectors.js) an agent uses for its
// outside actions. Without them the agent still works, but only on what you
// paste into the chat, and says what to connect.

export const AGENTS = [
    {
        id: 'manager',
        name: 'MENDI MANAGER',
        label: 'המנהל הראשי',
        summary: 'מקבל ממך משימה, מחלק אותה בין הסוכנים, בודק את התוצאות ומחזיר תשובה אחת מסודרת.',
        example: 'תטפל לי בפגישה האחרונה: תסכם אותה, תכין מצגת ותשלח אותה למשתתפים.',
        icon: '🧠',
        color: 'bg-indigo-500',
        needs: []
    },
    {
        id: 'meeting',
        name: 'MENDI MEETING',
        label: 'סוכן הישיבות',
        summary: 'מושך תמלול של פגישת Zoom שהוקלטה (או תמלול שהדבקת), מזהה החלטות ומשימות ומכין סיכום.',
        example: 'תמצא את הפגישה שהייתה היום ב-Zoom ותסכם אותה.',
        icon: '🎥',
        color: 'bg-sky-500',
        needs: ['zoom']
    },
    {
        id: 'mail',
        name: 'MENDI MAIL',
        label: 'סוכן המיילים וההודעות',
        summary: 'מנסח מיילים והודעות WhatsApp, מצרף קבצים ושולח רק אחרי האישור שלך.',
        example: 'תכין מייל תודה למשתתפים עם המצגת המצורפת.',
        icon: '✉️',
        color: 'bg-rose-500',
        needs: ['email', 'whatsapp']
    },
    {
        id: 'presentation',
        name: 'MENDI PRESENTATION',
        label: 'סוכן המצגות',
        summary: 'בונה מצגות PowerPoint מעוצבות בעברית, עם תרשימים, הערות דובר ושקופיות סיכום.',
        example: 'תכין מצגת של 8 שקופיות על תוכנית השיווק לרבעון הבא.',
        icon: '📊',
        color: 'bg-amber-500',
        needs: []
    },
    {
        id: 'secretary',
        name: 'MENDI SECRETARY',
        label: 'המזכיר האישי',
        summary: 'מנהל רשימת משימות ותזכורות, מארגן את היום ומכין זימוני פגישה לשליחה.',
        example: 'תארגן לי את מחר ותכין זימון לפגישה עם דני ביום ראשון ב-10:00.',
        icon: '🗓️',
        color: 'bg-emerald-500',
        needs: []
    },
    {
        id: 'business',
        name: 'MENDI BUSINESS',
        label: 'סוכן העסקים',
        summary: 'חוקר הזדמנויות, מנתח רעיונות, בונה תוכניות עסקיות ומציע איך לשפר את העסק.',
        example: 'תנתח את הרעיון לפתוח סטודיו לפילאטיס ברמת גן ותכין תוכנית עסקית.',
        icon: '💼',
        color: 'bg-violet-500',
        needs: []
    },
    {
        id: 'research',
        name: 'MENDI RESEARCH',
        label: 'החוקר',
        summary: 'מחפש באינטרנט, משווה מחירים, חוקר מתחרים ומכין דוחות מחקר עם מקורות.',
        example: 'תשווה לי מחירים של 3 מערכות CRM לעסק קטן בישראל.',
        icon: '🔎',
        color: 'bg-cyan-500',
        needs: []
    },
    {
        id: 'marketing',
        name: 'MENDI MARKETING',
        label: 'מנהל השיווק',
        summary: 'כותב פרסומות ופוסטים, מציע קמפיינים ומנתח תוצאות שיווקיות שתדביק לו.',
        example: 'תכתוב 5 פוסטים לאינסטגרם על ההשקה של השירות החדש.',
        icon: '📣',
        color: 'bg-pink-500',
        needs: []
    },
    {
        id: 'finance',
        name: 'MENDI FINANCE',
        label: 'סוכן הכספים',
        summary: 'מכין דוחות הכנסות והוצאות, מנתח תקציבים ומסדר נתונים בטבלה שנפתחת באקסל.',
        example: 'הנה ההוצאות של החודש. תסדר אותן בטבלה לפי קטגוריות ותגיד איפה אפשר לחסוך.',
        icon: '💰',
        color: 'bg-lime-500',
        needs: []
    },
    {
        id: 'service',
        name: 'MENDI SERVICE',
        label: 'שירות לקוחות',
        summary: 'מנסח תשובות ללקוחות, מטפל בשאלות ובהזמנות, ומעביר אליך פניות מורכבות.',
        example: 'לקוח כתב לי: "ההזמנה לא הגיעה". תנסח תשובה ותשלח לו בוואטסאפ.',
        icon: '🤝',
        color: 'bg-orange-500',
        needs: ['whatsapp']
    }
];

export const AGENT_IDS = AGENTS.map((agent) => agent.id);
export const SPECIALIST_IDS = AGENT_IDS.filter((id) => id !== 'manager');

export function getAgent(id) {
    return AGENTS.find((agent) => agent.id === id) ?? null;
}

// The kinds of outside action an agent can prepare. Each one waits in the
// approvals queue unless you allowed it to run by itself (settings).
export const ACTION_KINDS = {
    email: { label: 'מייל', icon: '✉️' },
    whatsapp: { label: 'WhatsApp', icon: '💬' }
};
