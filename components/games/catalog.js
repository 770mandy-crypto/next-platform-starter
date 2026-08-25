/** Every game in the arcade. Gradient classes are written out in full so Tailwind can find them. */
export const GAMES = [
    {
        slug: 'space-shooter',
        emoji: '🚀',
        gradient: 'from-fuchsia-500 via-purple-500 to-indigo-500',
        glow: 'shadow-fuchsia-500/40',
        he: {
            title: 'קרב חלל',
            tagline: 'הפיל את הצי הזר',
            description: 'נווט את החללית, ירה בפולשים ושרוד כמה שיותר גלים. שלושה חיים בלבד.',
            controls: 'חצים / A־D לתנועה, רווח לירי — או פשוט גרור את האצבע על המסך'
        },
        en: {
            title: 'Space Battle',
            tagline: 'Take down the alien fleet',
            description: 'Fly your ship, shoot the invaders and survive as many waves as you can. Three lives only.',
            controls: 'Arrows / A–D to move, Space to shoot — or just drag your finger on screen'
        }
    },
    {
        slug: 'target-range',
        emoji: '🎯',
        gradient: 'from-amber-400 via-orange-500 to-rose-500',
        glow: 'shadow-orange-500/40',
        he: {
            title: 'מטווח קליעה',
            tagline: '45 שניות של דיוק',
            description: 'מטרות קופצות ונעלמות. פגע מהר ככל האפשר, בנה רצף — והיזהר מהחביות האדומות.',
            controls: 'כוון עם העכבר או האצבע ולחץ כדי לירות'
        },
        en: {
            title: 'Shooting Range',
            tagline: '45 seconds of precision',
            description: 'Targets pop up and fade away. Hit them fast, build a streak — and avoid the red barrels.',
            controls: 'Aim with the mouse or your finger and tap to shoot'
        }
    },
    {
        slug: 'balloon-pop',
        emoji: '🎈',
        gradient: 'from-sky-400 via-cyan-400 to-emerald-400',
        glow: 'shadow-cyan-500/40',
        he: {
            title: 'ציד בלונים',
            tagline: 'אל תיתן להם לברוח',
            description: 'בלונים צבעוניים עולים למעלה. פוצץ אותם לפני שייעלמו, ואל תיגע בפצצות השחורות.',
            controls: 'לחץ או הקש על בלון כדי לפוצץ אותו'
        },
        en: {
            title: 'Balloon Hunt',
            tagline: "Don't let them escape",
            description: "Colourful balloons float up. Pop them before they get away, and never touch a black bomb.",
            controls: 'Click or tap a balloon to pop it'
        }
    },
    {
        slug: 'snake',
        emoji: '🐍',
        gradient: 'from-lime-400 via-green-500 to-emerald-600',
        glow: 'shadow-green-500/40',
        he: {
            title: 'נחש',
            tagline: 'אכול, גדל, אל תתנגש',
            description: 'הובל את הנחש אל התפוחים בלי לפגוע בקיר או בגוף שלך. כל תפוח מאריך אותו — ומקשה עליך.',
            controls: 'חצים / WASD לכיוון — או החלק עם האצבע על המסך'
        },
        en: {
            title: 'Snake',
            tagline: 'Eat, grow, don’t crash',
            description: 'Guide the snake to the apples without hitting the wall or your own tail. Every apple makes it longer.',
            controls: 'Arrows / WASD to steer — or swipe on the screen'
        }
    },
    {
        slug: '2048',
        emoji: '🔢',
        gradient: 'from-amber-300 via-yellow-500 to-orange-600',
        glow: 'shadow-amber-500/40',
        he: {
            title: '2048',
            tagline: 'מזג מספרים עד לניצחון',
            description: 'החלק אריחים לכל כיוון, מזג מספרים זהים והגע ל־2048. הלוח מתמלא בכל תזוזה — תכנן קדימה.',
            controls: 'חצים / WASD להחלקה — או החלק עם האצבע על המסך'
        },
        en: {
            title: '2048',
            tagline: 'Merge your way to victory',
            description: 'Slide tiles in any direction, merge matching numbers and reach 2048. The board fills with every move.',
            controls: 'Arrows / WASD to slide — or swipe on the screen'
        }
    },
    {
        slug: 'memory-match',
        emoji: '🃏',
        gradient: 'from-violet-500 via-purple-500 to-fuchsia-600',
        glow: 'shadow-purple-500/40',
        he: {
            title: 'זיכרון קלפים',
            tagline: 'מצא את הזוגות',
            description: 'הפוך שני קלפים בכל תור ומצא זוגות תואמים. סיים את כל הלוח במינימום הפיכות ובזמן הכי קצר.',
            controls: 'לחץ או הקש על קלף כדי להפוך אותו'
        },
        en: {
            title: 'Memory Match',
            tagline: 'Find the pairs',
            description: 'Flip two cards each turn and find matching pairs. Clear the board in as few flips and as little time as possible.',
            controls: 'Click or tap a card to flip it'
        }
    }
];

export function getGame(slug) {
    return GAMES.find((game) => game.slug === slug);
}

export function highScoreKey(slug) {
    return `games:hi:${slug}`;
}
