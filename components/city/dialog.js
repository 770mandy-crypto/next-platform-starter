// Scripted, local-only conversations with the citizens. No network, no model:
// a reply is picked by matching a few Hebrew keywords.

export const CITIZENS = [
    { name: 'נועה', role: 'אדריכלית' },
    { name: 'איתן', role: 'נהג מונית' },
    { name: 'תמר', role: 'בעלת בית קפה' },
    { name: 'יואב', role: 'טייס מסוקים' },
    { name: 'שירה', role: 'מדריכת טיולים' },
    { name: 'עומר', role: 'סטודנט' },
    { name: 'מיכל', role: 'ספרנית' },
    { name: 'דניאל', role: 'גנן העירייה' },
    { name: 'רוני', role: 'צלמת' },
    { name: 'אלון', role: 'שליח' },
    { name: 'הילה', role: 'מוזיקאית' },
    { name: 'גיא', role: 'מהנדס' },
    { name: 'יעל', role: 'רופאה' },
    { name: 'אסף', role: 'אופה' },
    { name: 'ליה', role: 'ציירת' },
    { name: 'נדב', role: 'חזאי' }
];

export const AMBIENT_LINES = [
    'איזה יום יפה לטיול!',
    'עלית כבר לגבעת המדרגות?',
    'מהגגות רואים את כל העיר.',
    'אומרים שבערב יורד גשם.',
    'המסוק ברחבה מחכה לטייס.',
    'אני מאחר לפגישה…',
    'הקפה בפינה הכי טוב בעיר.',
    'כל כך הרבה מדרגות!',
    'שלום שלום!',
    'בלילה כל החלונות נדלקים.'
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

/** A small talk line that fits what is going on in the city right now. */
export function ambientLine({ wanted = false, rain = false, night = false } = {}) {
    const pool = [...AMBIENT_LINES];
    if (wanted) pool.push('שמעתם? המשטרה במרדף!', 'אל תסתובבו ליד הבנקים הערב.', 'אני לא פותח את הדלת עד שזה ייגמר.');
    if (rain) pool.push('הגשם הזה לא נגמר.', 'מישהו ראה את המטריה שלי?');
    if (night) pool.push('בלילה העיר נראית אחרת לגמרי.', 'החלונות הדולקים מספרים סיפורים.');
    return pick(pool);
}

/** What a citizen shouts when shots or a chase come close. */
export const panicLine = () => pick(['!בורחים', 'מה קורה?!', 'הצילו!', 'לברוח!']);

const INTENTS = [
    {
        test: /שלום|היי|הי |אהלן|בוקר טוב|ערב טוב|מה נשמע|מה שלומך/,
        reply: (c) => pick([`שלום! אני ${c.name}. נעים מאוד.`, 'אהלן! מה מביא אותך לעיר?', 'היי, הכול טוב. ואצלך?'])
    },
    {
        test: /שמך|קוראים לך|מי את|מי אתה/,
        reply: (c) => `קוראים לי ${c.name}, ואני ${c.role} כאן בעיר.`
    },
    {
        test: /עובד|עבודה|עוסק|מקצוע/,
        reply: (c) => `אני ${c.role}. עבודה טובה, רק שיש הרבה מדרגות בדרך.`
    },
    {
        test: /גבע|פסג|מצפה|נוף/,
        reply: () => 'גבעת המדרגות נמצאת בדיוק במרכז העיר. מטפסים עד הפסגה ורואים את הכול.'
    },
    {
        test: /מסוק|לטוס|טיס/,
        reply: () => 'המסוק חונה ברחבת המסוקים, בדרום־מערב העיר. אפשר לנחות איתו על הגגות.'
    },
    {
        test: /רכב|מכונית|אוטו|לנהוג|נהיג/,
        reply: () => 'יש מכוניות חונות לאורך הרחובות. ניגשים אליהן ולוחצים E כדי להיכנס.'
    },
    {
        test: /גג|מדרגות|לעלות|לטפס/,
        reply: () => 'ליד הרבה בניינים יש גרם מדרגות חיצוני. עולים קומה אחרי קומה עד הגג.'
    },
    {
        test: /מזג|גשם|ערפל|שמש|חם|קר/,
        reply: () => pick(['מזג האוויר כאן מתחלף מהר. אפשר לשנות אותו בלוח האקלים.', 'אני אוהב את העיר דווקא בגשם, הכול נוצץ.'])
    },
    {
        test: /לילה|ערב|שעה|זמן/,
        reply: () => 'בלילה נדלקים הפנסים והחלונות. שווה לעלות אז לאחד הגגות.'
    },
    {
        test: /איפה|איך מגיע|לאן|מה יש|מה כדאי|ממליצ/,
        reply: () => pick(['כדאי להתחיל בגבעת המדרגות שבמרכז, ואז לחפש גג גבוה.', 'בגנים שקט ונעים, ובדרום־מערב יש מסוק שאפשר להטיס.'])
    },
    {
        test: /תודה|תודות/,
        reply: () => pick(['בשמחה!', 'על לא דבר, טיול נעים.'])
    },
    {
        test: /ביי|להתראות|שלום ולהתראות|יום טוב/,
        reply: () => pick(['להתראות, ושמור על עצמך במדרגות!', 'ביי! נתראה ברחובות.'])
    }
];

const FALLBACK = [
    'מעניין… ספר לי עוד.',
    'לא בטוח שהבנתי, אבל אפשר לשאול אותי על העיר, על המסוק או על הגגות.',
    'אני בעיקר מכיר את הרחובות כאן. רוצה המלצה לאן ללכת?'
];

export function greeting(citizen) {
    return `שלום, אני ${citizen.name}, ${citizen.role}. במה אפשר לעזור?`;
}

export function replyFor(citizen, text) {
    const clean = ` ${text.trim()} `;
    for (const intent of INTENTS) if (intent.test.test(clean)) return intent.reply(citizen);
    return pick(FALLBACK);
}
