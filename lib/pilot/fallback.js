// Demo mode: a deterministic stand-in for Claude, used when no API key is
// configured (or when a Claude call fails). It keeps the whole flow — plan,
// tasks, memory, agent proposals, approvals — usable end to end, so the product
// can be demoed and tested without spending a token.

const TEMPLATES = [
    {
        id: 'business',
        match: /עסק|סטארט|startup|מוצר|לקוחות|מכירות|חנות|אפליקציה|הכנס|שיווק|מותג/i,
        milestones: [
            {
                title: 'אימות הרעיון',
                description: 'לוודא שיש בעיה אמיתית ואנשים שמוכנים לשלם על הפתרון.',
                tasks: [
                    { title: 'לחקור 5 מתחרים ולסכם את הפערים', module: 'research' },
                    { title: 'לכתוב פרופיל לקוח אידיאלי', module: 'planner' },
                    { title: 'לקבוע 5 שיחות עם לקוחות פוטנציאליים', module: 'agents' }
                ]
            },
            {
                title: 'בניית MVP',
                description: 'גרסה ראשונה ומינימלית שפותרת את הבעיה המרכזית בלבד.',
                tasks: [
                    { title: 'להגדיר 3 יכולות ליבה ולא יותר', module: 'planner' },
                    { title: 'לכתוב דף נחיתה עם הצעת ערך ברורה', module: 'creator' },
                    { title: 'לבנות אב-טיפוס ולבדוק אותו עם 3 משתמשים', module: 'agents' }
                ]
            },
            {
                title: 'השקה ומשתמשים ראשונים',
                description: 'להביא את 10 המשתמשים הראשונים וללמוד מהם.',
                tasks: [
                    { title: 'לכתוב פוסט השקה', module: 'creator' },
                    { title: 'לשלוח מייל לרשימת המתעניינים', module: 'agents' },
                    { title: 'לעקוב אחרי מדדי שימוש שבועיים', module: 'monitor' }
                ]
            }
        ]
    },
    {
        id: 'learning',
        match: /ללמוד|לימוד|קורס|מבחן|שפה|תכנות|מיומנות|תואר/i,
        milestones: [
            {
                title: 'מיפוי החומר',
                description: 'להבין מה צריך לדעת ובאיזה סדר.',
                tasks: [
                    { title: 'לחקור את המקורות הטובים ביותר לנושא', module: 'research' },
                    { title: 'לבנות סילבוס של 4 שבועות', module: 'planner' }
                ]
            },
            {
                title: 'תרגול קבוע',
                description: 'שגרה יומית קצרה במקום מרתונים.',
                tasks: [
                    { title: 'לקבוע ביומן 30 דקות לימוד ביום', module: 'agents' },
                    { title: 'ליצור כרטיסיות חזרה לחומר השבוע', module: 'creator' },
                    { title: 'לסכם כל שבוע מה נלמד ומה נתקע', module: 'monitor' }
                ]
            },
            {
                title: 'הוכחת יכולת',
                description: 'פרויקט או מבחן שמראה שהמטרה הושגה.',
                tasks: [
                    { title: 'לבחור פרויקט מסכם', module: 'planner' },
                    { title: 'להשלים את הפרויקט ולשתף אותו', module: 'agents' }
                ]
            }
        ]
    },
    {
        id: 'career',
        match: /עבודה|משרה|קריירה|ראיון|קורות חיים|גיוס|קידום/i,
        milestones: [
            {
                title: 'מיקוד',
                description: 'להחליט איזה תפקיד ואיזה חברות.',
                tasks: [
                    { title: 'לחקור 10 חברות יעד', module: 'research' },
                    { title: 'לעדכן קורות חיים לתפקיד היעד', module: 'creator' }
                ]
            },
            {
                title: 'פנייה',
                description: 'פניות ממוקדות במקום הפצה המונית.',
                tasks: [
                    { title: 'לכתוב מייל פנייה אישי', module: 'creator' },
                    { title: 'לשלוח 5 פניות בשבוע', module: 'agents' },
                    { title: 'לעקוב אחרי תגובות ופולואפים', module: 'monitor' }
                ]
            },
            {
                title: 'ראיונות',
                description: 'הכנה מסודרת לכל שלב.',
                tasks: [
                    { title: 'להכין תשובות ל-10 שאלות נפוצות', module: 'planner' },
                    { title: 'לקבוע ראיון תרגול', module: 'agents' }
                ]
            }
        ]
    }
];

const GENERIC = {
    id: 'generic',
    milestones: [
        {
            title: 'הבנת המטרה',
            description: 'להגדיר מה נחשב הצלחה ואיך נמדוד אותה.',
            tasks: [
                { title: 'לחקור איך אחרים השיגו מטרה דומה', module: 'research' },
                { title: 'להגדיר מדד הצלחה אחד ברור', module: 'planner' }
            ]
        },
        {
            title: 'ביצוע',
            description: 'צעדים קטנים וקבועים.',
            tasks: [
                { title: 'לפרק את המטרה ל-5 צעדים שבועיים', module: 'planner' },
                { title: 'לקבוע ביומן זמן קבוע לעבודה על המטרה', module: 'agents' },
                { title: 'ליצור חומר עזר ראשון', module: 'creator' }
            ]
        },
        {
            title: 'תוצאה',
            description: 'לבדוק שהגענו ליעד וללמוד מהדרך.',
            tasks: [
                { title: 'למדוד את ההתקדמות מול המדד', module: 'monitor' },
                { title: 'לשתף את התוצאה', module: 'agents' }
            ]
        }
    ]
};

export function pickTemplate(goal = '') {
    return TEMPLATES.find((template) => template.match.test(goal)) ?? GENERIC;
}

export function fallbackPlan({ goal, context = '', weeks = 6 }) {
    const template = pickTemplate(`${goal} ${context}`);
    const perMilestone = Math.max(1, Math.round(weeks / template.milestones.length));
    return {
        summary: `תוכנית של ${weeks} שבועות להשגת המטרה: "${goal}". מתחילים בהבנה ובאימות, עוברים לביצוע בצעדים קטנים, ומסיימים במדידה של התוצאה.`,
        firstStep: template.milestones[0].tasks[0].title,
        risks: ['לנסות לעשות הכול בבת אחת במקום צעד אחד בכל פעם', 'לא למדוד התקדמות ולגלות מאוחר מדי שתקועים'],
        milestones: template.milestones.map((milestone, index) => ({
            title: milestone.title,
            description: milestone.description,
            weeks: perMilestone,
            order: index + 1,
            tasks: milestone.tasks.map((task) => ({ ...task, detail: '' }))
        }))
    };
}

// Pull a date out of free Hebrew text: "מחר", "ביום ראשון" is out of scope for
// the demo, so anything unrecognised defaults to tomorrow at 10:00.
export function guessWhen(text = '', now = new Date()) {
    const date = new Date(now);
    if (/היום/.test(text)) date.setDate(date.getDate());
    else if (/מחרתיים/.test(text)) date.setDate(date.getDate() + 2);
    else if (/שבוע הבא/.test(text)) date.setDate(date.getDate() + 7);
    else date.setDate(date.getDate() + 1);

    const time = text.match(/(\d{1,2}):(\d{2})/) ?? text.match(/בשעה\s*(\d{1,2})/);
    date.setHours(time ? Number(time[1]) : 10, time?.[2] ? Number(time[2]) : 0, 0, 0);
    return date.toISOString();
}

export function fallbackChat({ message, project }) {
    const text = message.trim();
    const goal = project?.goal || 'המטרה שלך';
    const email = text.match(/[A-Za-z0-9][\w.+-]*@[\w-]+(?:\.[\w-]+)+/)?.[0] ?? '';
    const result = { reply: '', memory: [], tasks: [], actions: [] };

    const remember = text.match(/(?:תזכור|זכור|חשוב לדעת)[: ,]+(.+)/);
    if (remember) {
        result.memory.push({ fact: remember[1].trim(), category: 'preference' });
    }

    if (/מייל|אימייל|email/i.test(text)) {
        result.actions.push({
            type: 'send_email',
            title: 'שליחת מייל',
            reason: 'ביקשת לשלוח מייל. הכנתי טיוטה — היא לא תישלח בלי האישור שלך.',
            params: {
                to: email,
                subject: `עדכון לגבי ${goal}`,
                body: `היי,\n\nרציתי לעדכן שאני עובד/ת על "${goal}" ואשמח לשמוע את דעתך.\n\nתודה!`
            }
        });
    }
    if (/פגיש|יומן|תזכורת|קבע|אירוע/.test(text)) {
        result.actions.push({
            type: 'schedule_event',
            title: 'קביעת אירוע ביומן',
            reason: 'הצעתי מועד לפי מה שכתבת. אפשר לשנות לפני האישור.',
            params: { title: `עבודה על: ${goal}`, when: guessWhen(text), durationMinutes: 45, description: text }
        });
    }
    if (/פוסט|לינקדאין|linkedin|לפרסם/i.test(text)) {
        result.actions.push({
            type: 'publish_post',
            title: 'פרסום פוסט',
            reason: 'כתבתי טיוטה לפוסט. שום דבר לא מתפרסם בלי אישור.',
            params: {
                platform: /טוויטר|twitter|\bx\b/i.test(text) ? 'x' : 'linkedin',
                text: `אני מתחיל/ה מסע חדש: ${goal}. אשתף כאן את ההתקדמות, את מה שעובד ואת מה שלא. מי עוד עבר משהו דומה? 👇`
            }
        });
    }
    if (/חקור|מחקר|מתחרים|תבדוק|research/i.test(text)) {
        result.actions.push({
            type: 'research_topic',
            title: 'מחקר',
            reason: 'מחקר הוא פעולה פנימית — היא רצה מיד ולא יוצאת החוצה.',
            params: { topic: text.replace(/^(חקור|תחקור|תבדוק)\s*/, '') || goal }
        });
    }
    if (/כתוב|תכתוב|צור|תיצור|טקסט|תוכן/.test(text) && !result.actions.length) {
        result.actions.push({
            type: 'create_content',
            title: 'יצירת תוכן',
            reason: 'יצירת טיוטה היא פעולה פנימית ורצה מיד.',
            params: { topic: text, kind: 'document' }
        });
    }
    const addTask = text.match(/(?:משימה|תוסיף משימה|הוסף משימה)[: ]+(.+)/);
    if (addTask) result.tasks.push({ title: addTask[1].trim(), detail: '', module: 'planner' });

    const parts = [];
    if (result.memory.length) parts.push(`שמרתי בזיכרון: "${result.memory[0].fact}".`);
    if (result.tasks.length) parts.push(`הוספתי משימה: "${result.tasks[0].title}".`);
    if (result.actions.some((action) => ['send_email', 'schedule_event', 'publish_post'].includes(action.type))) {
        parts.push('הכנתי פעולה שמחכה לאישור שלך בלשונית 🔐 אישורים.');
    }
    if (result.actions.some((action) => ['research_topic', 'create_content'].includes(action.type))) {
        parts.push('הסוכן מתחיל לעבוד על זה עכשיו.');
    }
    if (!parts.length) {
        parts.push(
            `הבנתי. כדי להתקדם עם "${goal}" הצעד הבא שלי הוא: ${project?.nextStep || 'לסמן את המשימה הראשונה בתוכנית ולהתחיל בה'}.`,
            'אפשר לבקש ממני לחקור נושא, לכתוב תוכן, לנסח מייל, לקבוע פגישה או לזכור משהו חשוב.'
        );
    }
    result.reply = parts.join(' ');
    return result;
}

export function fallbackExecute(action) {
    const topic = action.params?.topic ?? '';
    if (action.type === 'research_topic') {
        return {
            title: `מחקר: ${topic}`,
            content: [
                `## מה בדקתי`,
                `סקירה ראשונית של "${topic}" (מצב הדגמה — עם מפתח API הסוכן כותב כאן מחקר אמיתי).`,
                `## ממצאים עיקריים`,
                `- מה כבר קיים בשוק ומה חסר`,
                `- מי קהל היעד ומה הכאב המרכזי שלו`,
                `- 2–3 כיוונים שכדאי לבדוק לעומק`,
                `## המלצה`,
                `להתחיל מהכיוון הפשוט ביותר לבדיקה, ולמדוד תגובה אמיתית לפני שמשקיעים יותר.`
            ].join('\n')
        };
    }
    return {
        title: `טיוטה: ${topic}`,
        content: `# ${topic}\n\nזו טיוטה ראשונה שנוצרה במצב הדגמה. עם מפתח API, ה-🎨 Creator כותב כאן תוכן מלא ומותאם לפרויקט ולזיכרון שלו.`
    };
}
