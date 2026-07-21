// מנוע המאמן החכם - מנתח את ההודעה של המשתמש ומחזיר תשובה מותאמת אישית ותוכנית אימון.
// המנוע מבוסס-כללים ופועל באופן מקומי (ללא תלות בשירות חיצוני), כך שהאפליקציה עובדת תמיד.
// ניתן לחבר כאן בעתיד מודל שפה חיצוני (למשל Claude API) על ידי החלפת הפונקציה generateReply.

import { EXERCISES, CATEGORIES } from './workouts.js';

const GOAL_KEYWORDS = {
    strength: ['כוח', 'שריר', 'שרירים', 'לבנות', 'מסה', 'חזק', 'חזקה'],
    cardio: ['אירובי', 'סבולת', 'לב', 'ריצה', 'לרזות', 'לשרוף', 'קלוריות', 'הרזיה', 'משקל'],
    core: ['בטן', 'ליבה', 'סיקס פק', 'בטן שטוחה', 'מרכז'],
    flexibility: ['גמישות', 'מתיחות', 'מתיחה', 'להתגמש', 'כאבי גב', 'גב תפוס', 'שחרור']
};

const MUSCLE_KEYWORDS = {
    רגליים: ['רגל', 'רגליים', 'ירך', 'ירכיים'],
    ישבן: ['ישבן', 'תחת', 'עכוז'],
    חזה: ['חזה'],
    כתפיים: ['כתף', 'כתפיים'],
    זרועות: ['יד', 'ידיים', 'זרוע', 'זרועות', 'ביצפס', 'טריצפס'],
    בטן: ['בטן', 'כרס'],
    גב: ['גב']
};

const LEVEL_KEYWORDS = {
    beginner: ['מתחיל', 'מתחילה', 'התחלה', 'חדש', 'חדשה', 'בסיסי', 'קל'],
    advanced: ['מתקדם', 'מתקדמת', 'קשה', 'אתגר', 'מנוסה']
};

const GREETING_KEYWORDS = ['שלום', 'היי', 'הי', 'בוקר טוב', 'ערב טוב', 'מה נשמע', 'מה קורה', 'אהלן'];
const THANKS_KEYWORDS = ['תודה', 'תודה רבה', 'מעולה', 'אחלה', 'סבבה'];

function normalize(text) {
    return (text || '').toLowerCase().replace(/[^֐-׿a-z0-9\s]/g, ' ');
}

// אותיות השימוש בעברית (ו/ה/ב/כ/ל/מ/ש) שעלולות להופיע כתחילית של מילה
const HEB_PREFIXES = ['ו', 'ה', 'ב', 'כ', 'ל', 'מ', 'ש'];

// התאמה ברמת המילה - מונעת התאמות שווא כמו "לב" בתוך "לבטן".
// תומכת בהסרת תחיליות (למשל "לרגליים" -> "רגליים").
function tokenMatchesKeyword(token, keyword) {
    if (token === keyword) return true;
    let t = token;
    for (let i = 0; i < 2 && t.length > keyword.length; i++) {
        if (HEB_PREFIXES.includes(t[0])) {
            t = t.slice(1);
            if (t === keyword) return true;
        } else {
            break;
        }
    }
    return false;
}

function matchAny(text, keywords) {
    const tokens = text.split(/\s+/).filter(Boolean);
    return keywords.some((kw) => {
        // ביטויים מרובי-מילים (עם רווח) נבדקים כתת-מחרוזת על הטקסט המלא
        if (kw.includes(' ')) return text.includes(kw);
        return tokens.some((tok) => tokenMatchesKeyword(tok, kw));
    });
}

// חילוץ מספר דקות מתוך ההודעה (למשל "יש לי 20 דקות")
function extractMinutes(text) {
    const match = text.match(/(\d{1,3})\s*(דקות|דקה|דק)/);
    if (match) return parseInt(match[1], 10);
    return null;
}

export function detectGoal(text) {
    for (const [goal, keywords] of Object.entries(GOAL_KEYWORDS)) {
        if (matchAny(text, keywords)) return goal;
    }
    return null;
}

export function detectMuscle(text) {
    for (const [muscle, keywords] of Object.entries(MUSCLE_KEYWORDS)) {
        if (matchAny(text, keywords)) return muscle;
    }
    return null;
}

export function detectLevel(text) {
    for (const [level, keywords] of Object.entries(LEVEL_KEYWORDS)) {
        if (matchAny(text, keywords)) return level;
    }
    return 'beginner';
}

// בניית תוכנית אימון לפי מטרה, שריר, רמה וזמן
export function buildPlan({ goal, muscle, level, minutes }) {
    let pool = EXERCISES.slice();

    if (goal) {
        pool = pool.filter((e) => e.category === goal);
    }
    if (muscle) {
        const byMuscle = pool.filter((e) => e.muscles.some((m) => m.includes(muscle) || muscle.includes(m)));
        if (byMuscle.length) pool = byMuscle;
    }

    // סינון לפי רמה - מתחיל לא יקבל תרגילים מתקדמים
    if (level === 'beginner') {
        const filtered = pool.filter((e) => e.level !== 'advanced');
        if (filtered.length) pool = filtered;
    }

    if (!pool.length) pool = EXERCISES.slice();

    // מספר תרגילים לפי הזמן הפנוי (בערך תרגיל לכל 4 דקות)
    let count = 4;
    if (minutes) count = Math.max(2, Math.min(6, Math.round(minutes / 4)));

    const selected = pool.slice(0, count);

    // פרמטרים של סטים/חזרות לפי רמה
    const scheme =
        level === 'advanced'
            ? { sets: 4, reps: '12-15', rest: '45 שניות' }
            : level === 'intermediate'
              ? { sets: 3, reps: '10-12', rest: '60 שניות' }
              : { sets: 3, reps: '8-10', rest: '75 שניות' };

    return {
        exercises: selected.map((e) => ({
            id: e.id,
            name: e.name,
            steps: e.steps,
            tips: e.tips,
            youtubeQuery: e.youtubeQuery,
            category: e.category,
            ...(e.category === 'flexibility'
                ? { prescription: 'החזיקו כל מתיחה 20-30 שניות, 2-3 חזרות' }
                : e.category === 'cardio'
                  ? { prescription: `${scheme.sets} סבבים של 30-45 שניות עבודה, ${scheme.rest} מנוחה` }
                  : { prescription: `${scheme.sets} סטים × ${scheme.reps} חזרות, ${scheme.rest} מנוחה` })
        })),
        scheme,
        goal,
        muscle,
        level,
        minutes
    };
}

// הפונקציה המרכזית: מקבלת הודעת משתמש ומחזירה תשובה מלאה
export function generateReply(message) {
    const text = normalize(message);

    // ברכות ותודות
    if (matchAny(text, THANKS_KEYWORDS) && text.trim().split(/\s+/).length <= 3) {
        return {
            reply: 'בשמחה! 🙏 זכרו: עקביות חשובה יותר מעצימות. אני כאן בכל פעם שתרצו אימון חדש. בהצלחה!',
            plan: null
        };
    }

    if (matchAny(text, GREETING_KEYWORDS) && !detectGoal(text) && !detectMuscle(text)) {
        return {
            reply:
                'שלום וברוכים הבאים! 👋 אני המאמן האישי שלכם. ספרו לי מה המטרה שלכם היום — ' +
                'לחזק שרירים, אימון אירובי לשריפת קלוריות, חיזוק הבטן, או מתיחות וגמישות? ' +
                'אפשר גם לציין כמה זמן יש לכם (למשל "20 דקות") ואיזו רמה אתם.',
            plan: null
        };
    }

    const goal = detectGoal(text);
    const muscle = detectMuscle(text);
    const level = detectLevel(text);
    const minutes = extractMinutes(text);

    // אם לא זוהתה שום כוונה ברורה
    if (!goal && !muscle) {
        return {
            reply:
                'לא בטוח שהבנתי בדיוק מה תרצו 🤔 נסו לנסח כך: "אני רוצה לחזק רגליים", ' +
                '"אימון אירובי של 15 דקות", "תרגילים לבטן למתחילים" או "מתיחות לגב". ' +
                'ואז אבנה לכם תוכנית אימון מותאמת אישית!',
            plan: null
        };
    }

    const plan = buildPlan({ goal, muscle, level, minutes });

    // בניית טקסט הפתיחה של התשובה
    const goalLabel = goal ? CATEGORIES[goal]?.label : null;
    const parts = [];
    parts.push('מעולה! הכנתי לכם תוכנית אימון' + (goalLabel ? ` ל${goalLabel}` : '') + '. 🎯');
    if (muscle) parts.push(`התמקדתי ב${muscle}.`);
    parts.push(`הרמה: ${level === 'advanced' ? 'מתקדם' : level === 'intermediate' ? 'בינוני' : 'מתחיל'}.`);
    if (minutes) parts.push(`התאמתי לזמן של כ-${minutes} דקות.`);
    parts.push('התחילו תמיד עם 3-5 דקות חימום קל, וסיימו במתיחות. שתו מים והקשיבו לגוף. 💧');

    return {
        reply: parts.join(' '),
        plan
    };
}
