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
    }
];

export function getGame(slug) {
    return GAMES.find((game) => game.slug === slug);
}

export function highScoreKey(slug) {
    return `games:hi:${slug}`;
}
