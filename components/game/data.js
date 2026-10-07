// Game content for "סערת הקרב" — an original battle royale inspired by the
// genre (drop from the sky, loot, build, survive the storm). All names, maps
// and characters here are our own.

export const GRID = 4; // horizontal build grid, metres
export const LEVEL_H = 3.2; // height of one build level

export const RARITIES = [
    { name: 'רגיל', color: '#a3a3a3', mult: 1 },
    { name: 'לא שכיח', color: '#30c552', mult: 1.06 },
    { name: 'נדיר', color: '#3b8cf6', mult: 1.12 },
    { name: 'אפי', color: '#b45cf7', mult: 1.19 },
    { name: 'אגדי', color: '#f5a10b', mult: 1.27 }
];

export const WEAPONS = {
    pistol: { name: 'אקדח', icon: '🔫', dmg: 24, rate: 6, mag: 16, reload: 1.4, spread: 0.012, range: 160, ammo: 'light', auto: false, pellets: 1, headMult: 1.6, len: 0.35, weight: 16 },
    smg: { name: 'תת-מקלע', icon: '🔫', dmg: 15, rate: 12, mag: 30, reload: 2.0, spread: 0.03, range: 120, ammo: 'light', auto: true, pellets: 1, headMult: 1.5, len: 0.55, weight: 20 },
    ar: { name: 'רובה סער', icon: '🔫', dmg: 30, rate: 5.5, mag: 30, reload: 2.2, spread: 0.014, range: 260, ammo: 'medium', auto: true, pellets: 1, headMult: 1.5, len: 0.8, weight: 30 },
    shotgun: { name: 'רובה ציד', icon: '🔫', dmg: 10, rate: 1.0, mag: 5, reload: 3.4, spread: 0.075, range: 45, ammo: 'shells', auto: false, pellets: 10, headMult: 1.5, len: 0.75, weight: 24 },
    sniper: { name: 'רובה צלפים', icon: '🎯', dmg: 105, rate: 0.55, mag: 1, reload: 2.4, spread: 0.002, range: 520, ammo: 'heavy', auto: false, pellets: 1, headMult: 2, len: 1.05, weight: 10, zoom: true }
};

export const PICKAXE = { name: 'מכוש', icon: '⛏️', dmg: 20, rate: 2.2, range: 3.2 };

export const AMMO = {
    light: { name: 'תחמושת קלה', color: '#9ec5ff', pack: 36 },
    medium: { name: 'תחמושת בינונית', color: '#7dd87d', pack: 30 },
    heavy: { name: 'תחמושת כבדה', color: '#e2a35b', pack: 6 },
    shells: { name: 'כדורי ציד', color: '#f06b6b', pack: 8 }
};

export const HEALS = {
    bandage: { name: 'תחבושת', icon: '🩹', time: 2.2, hp: 15, cap: 75, stack: 15, color: '#f5f5f4', pack: 5 },
    medkit: { name: 'ערכת עזרה', icon: '➕', time: 4, hp: 100, cap: 100, stack: 3, color: '#ef4444', pack: 1 },
    mini: { name: 'שיקוי קטן', icon: '💧', time: 1.4, shield: 25, cap: 50, stack: 6, color: '#60a5fa', pack: 3 },
    shield: { name: 'שיקוי מגן', icon: '🧪', time: 3, shield: 50, cap: 100, stack: 3, color: '#2563eb', pack: 1 }
};

export const BUILD_COST = 10;
export const BUILD_PIECES = {
    wall: { name: 'קיר', key: 'Z', hp: 150 },
    floor: { name: 'רצפה', key: 'X', hp: 140 },
    ramp: { name: 'רמפה', key: 'C', hp: 140 }
};

// Each character is a real, fully-modelled hero with a perk. Finishing a world
// in the top 3 unlocks the character whose unlockWorld matches it.
export const CHARACTERS = [
    {
        id: 'raz', name: 'רז', title: 'הסייר', unlockWorld: -1,
        perk: 'מתחיל עם אקדח לא שכיח', perkKey: 'startWeapon',
        look: { skin: '#e8b48a', shirt: '#3f7d46', sleeve: '#356b3b', pants: '#34495e', shoes: '#2b2118', hair: '#5a3825', hairStyle: 'short', backpack: '#6b4f2a', accent: '#c9a227' }
    },
    {
        id: 'noa', name: 'נועה', title: 'הצנחנית', unlockWorld: 0,
        perk: 'נוחתת עם 50 מגן', perkKey: 'startShield',
        look: { skin: '#f1c7a5', shirt: '#f97316', sleeve: '#ea580c', pants: '#f97316', shoes: '#1f2937', hair: '#b45309', hairStyle: 'ponytail', hat: 'goggles', backpack: '#334155', accent: '#111827' }
    },
    {
        id: 'max', name: 'מקס', title: 'הבנאי', unlockWorld: 1,
        perk: '+50% חומרים מכרייה ו-100 חומרים בהתחלה', perkKey: 'builder',
        look: { skin: '#c68b5e', shirt: '#2563eb', sleeve: '#f4f4f5', pants: '#1e3a8a', shoes: '#78350f', hair: '#1c1917', hairStyle: 'short', hat: 'hardhat', backpack: '#f59e0b', accent: '#facc15', beard: '#3f2a1a' }
    },
    {
        id: 'luna', name: 'לונה', title: 'הנינג׳ה', unlockWorld: 2,
        perk: 'רצה 12% מהר יותר', perkKey: 'speed',
        look: { skin: '#e9c2a0', shirt: '#18181b', sleeve: '#27272a', pants: '#18181b', shoes: '#09090b', hair: '#18181b', hairStyle: 'none', hat: 'ninja', backpack: '#7f1d1d', accent: '#dc2626', scarf: '#dc2626' }
    },
    {
        id: 'dino', name: 'דינו', title: 'הזאב-לטאה', unlockWorld: 3,
        perk: 'מתרפא לבד מחוץ לקרב', perkKey: 'regen',
        look: { skin: '#f0c19c', shirt: '#4ade80', sleeve: '#22c55e', pants: '#16a34a', shoes: '#14532d', hair: '#000000', hairStyle: 'none', hat: 'dino', backpack: '#15803d', accent: '#fde047', chest: '#fef9c3' }
    },
    {
        id: 'barak', name: 'קפטן ברק', title: 'גיבור-על', unlockWorld: 4,
        perk: 'קופץ 35% גבוה יותר', perkKey: 'jump',
        look: { skin: '#d9a07a', shirt: '#1d4ed8', sleeve: '#1d4ed8', pants: '#1e3a8a', shoes: '#b91c1c', hair: '#111827', hairStyle: 'short', hat: 'mask', cape: '#dc2626', accent: '#facc15', chest: '#facc15' }
    },
    {
        id: 'shelgit', name: 'שלגית', title: 'מלכת הקרח', unlockWorld: 5,
        perk: 'הסערה פוגעת בה רק בחצי', perkKey: 'storm',
        look: { skin: '#f5e1d4', shirt: '#a5f3fc', sleeve: '#e0f2fe', pants: '#38bdf8', shoes: '#f0f9ff', hair: '#f8fafc', hairStyle: 'long', hat: 'icecrown', cape: '#7dd3fc', accent: '#0ea5e9', glow: '#67e8f9' }
    },
    {
        id: 'king', name: 'המלך הזהוב', title: 'אגדה', unlockWorld: 6,
        perk: '+12% נזק לכל הנשקים', perkKey: 'damage',
        look: { skin: '#b07a52', shirt: '#eab308', sleeve: '#ca8a04', pants: '#a16207', shoes: '#713f12', hair: '#1c1917', hairStyle: 'short', hat: 'crown', cape: '#7e22ce', accent: '#fef08a', chest: '#fde68a', glow: '#facc15' }
    }
];

// Each world is its own region with its own named places, buildings and biome.
export const WORLDS = [
    {
        id: 'hills', name: 'עמק הגבעות', subtitle: 'גבעות ירוקות, חוות ואגמים', emoji: '🌳', seed: 11,
        sky: '#8fd3ff', fog: '#bfe6ff', sun: '#fff4d6',
        ground: ['#5fae4a', '#4a8f3a', '#7a7a5a'], shore: '#e8d9a0', water: '#2f8fd8', waterLevel: 0,
        terrain: { base: 5, amp: 9, freq: 0.012, style: 'hills' },
        trees: { type: 'round', count: 150 }, rocks: 35, rockColor: '#8b8f94',
        build: { wall: '#c9a477', roof: '#b4433a', floor: '#8a6a45', floors: [1, 2], houses: [3, 4], size: [1, 3] },
        pois: ['חוות התירס', 'כפר הנחל', 'גבעת המגדל', 'אחוזת האגם', 'שוק הכפר', 'מחנה העצים'],
        bots: 7, aim: 0.1, react: 0.95, botDmg: 0.55, botBuild: 0, rarity: [55, 30, 12, 3, 0]
    },
    {
        id: 'city', name: 'עיר המגדלים', subtitle: 'גורדי שחקים, רחובות וגגות', emoji: '🏙️', seed: 23,
        sky: '#9cc7e8', fog: '#c8d8e6', sun: '#ffffff',
        ground: ['#6b8f5a', '#5c7a4e', '#7d7d7d'], shore: '#d8cfa8', water: '#2a7bbf', waterLevel: 0,
        terrain: { base: 5, amp: 4, freq: 0.01, style: 'flat' },
        trees: { type: 'round', count: 60 }, rocks: 10, rockColor: '#7c7f84',
        build: { wall: '#9aa3ad', roof: '#4b5563', floor: '#6b7280', floors: [2, 5], houses: [3, 4], size: [2, 2], windows: '#7cc7ff' },
        pois: ['מגדלי המרכז', 'רחוב השוק', 'תחנת הרכבת', 'פארק העיר', 'נמל העיר', 'מרכז הקניות'],
        bots: 9, aim: 0.085, react: 0.85, botDmg: 0.62, botBuild: 0.1, rarity: [48, 32, 14, 5, 1]
    },
    {
        id: 'desert', name: 'דיונות הזהב', subtitle: 'מדבר, מקדשים ונווה מדבר', emoji: '🏜️', seed: 37,
        sky: '#ffd9a0', fog: '#f5dcb4', sun: '#fff1c9',
        ground: ['#e3c27a', '#d6ad62', '#b8864a'], shore: '#f0dca0', water: '#2bb3c0', waterLevel: -2,
        terrain: { base: 5, amp: 7, freq: 0.01, style: 'dunes' },
        trees: { type: 'cactus', count: 90 }, rocks: 45, rockColor: '#b07a4a',
        build: { wall: '#e0c08a', roof: '#c49a5a', floor: '#a47a45', floors: [1, 2], houses: [3, 4], size: [1, 2] },
        pois: ['מקדש החול', 'נווה המדבר', 'עיירת הכורים', 'קניון האבן', 'מחנה השיירה', 'הפירמידה'],
        bots: 11, aim: 0.075, react: 0.75, botDmg: 0.7, botBuild: 0.2, rarity: [44, 32, 16, 6, 2]
    },
    {
        id: 'snow', name: 'פסגות הקרח', subtitle: 'הרים מושלגים ואגם קפוא', emoji: '🏔️', seed: 41,
        sky: '#c7dcf0', fog: '#e4eef7', sun: '#ffffff',
        ground: ['#e9f1f7', '#d3e2ee', '#9fb3c4'], shore: '#cfe0ea', water: '#8fc6e8', waterLevel: 0,
        terrain: { base: 6, amp: 10, freq: 0.012, style: 'mountains' },
        trees: { type: 'snowpine', count: 160 }, rocks: 30, rockColor: '#94a3b8',
        build: { wall: '#8b5e3c', roof: '#f8fafc', floor: '#6b4428', floors: [1, 2], houses: [3, 4], size: [1, 2] },
        pois: ['כפר הסקי', 'האגם הקפוא', 'מצודת השלג', 'מערת הקרח', 'תחנת הרכבל', 'בקתות האורנים'],
        bots: 13, aim: 0.065, react: 0.65, botDmg: 0.78, botBuild: 0.3, rarity: [40, 32, 18, 7, 3]
    },
    {
        id: 'volcano', name: 'האי הוולקני', subtitle: 'לבה, אפר וסלעים בוערים', emoji: '🌋', seed: 53,
        sky: '#d9907a', fog: '#b98272', sun: '#ffd0a0',
        ground: ['#5b4a42', '#3f3431', '#2b2523'], shore: '#4a4040', water: '#1f3a4d', waterLevel: 0,
        terrain: { base: 5, amp: 8, freq: 0.013, style: 'volcano' },
        trees: { type: 'dead', count: 70 }, rocks: 70, rockColor: '#3a3330',
        build: { wall: '#6b6460', roof: '#2b2523', floor: '#4a423e', floors: [1, 2], houses: [3, 4], size: [1, 2] },
        pois: ['נמל הלבה', 'מעבדת הסלע', 'חוף האפר', 'מקדש האש', 'כפר הדייגים', 'מצפה הלוע'],
        lava: true, noCenterPoi: true,
        bots: 15, aim: 0.056, react: 0.55, botDmg: 0.85, botBuild: 0.4, rarity: [36, 32, 20, 8, 4]
    },
    {
        id: 'jungle', name: 'ג׳ונגל המקדש', subtitle: 'צמחייה עבותה ומקדשים עתיקים', emoji: '🌴', seed: 67,
        sky: '#a8e0c0', fog: '#a9d6b6', sun: '#fff7d6',
        ground: ['#2f8a3a', '#256f2f', '#4f6b3a'], shore: '#d9cc8a', water: '#1d8a8a', waterLevel: 0,
        terrain: { base: 5, amp: 11, freq: 0.014, style: 'hills' },
        trees: { type: 'jungle', count: 200 }, rocks: 30, rockColor: '#6f7f68',
        build: { wall: '#8a8f7a', roof: '#4d6b3a', floor: '#6b6450', floors: [1, 3], houses: [3, 4], size: [1, 2] },
        pois: ['מקדש הנחש', 'עץ החיים', 'מפל הנהר', 'כפר העצים', 'חורבות הירקן', 'ביצת הצפרדעים'],
        bots: 17, aim: 0.048, react: 0.48, botDmg: 0.92, botBuild: 0.5, rarity: [34, 32, 20, 9, 5]
    },
    {
        id: 'legends', name: 'אי האגדות', subtitle: 'הקרב האחרון — כל האזורים יחד', emoji: '👑', seed: 79,
        sky: '#b9a8ff', fog: '#d0c6ff', sun: '#fff4e0',
        ground: ['#5fae4a', '#4a8f3a', '#e9f1f7'], shore: '#e8d9a0', water: '#3b6fe0', waterLevel: 0,
        terrain: { base: 5, amp: 9, freq: 0.012, style: 'mixed' },
        trees: { type: 'pine', count: 150 }, rocks: 40, rockColor: '#8b8f94',
        build: { wall: '#b9b2d8', roof: '#6d28d9', floor: '#7c6fa8', floors: [1, 4], houses: [3, 5], size: [1, 2] },
        pois: ['מצודת האגדות', 'עיר הזהב', 'המקדש האבוד', 'נמל הכתר', 'פסגת הסערה', 'חוות הכוכבים', 'כיכר המלכים'],
        bots: 19, aim: 0.04, react: 0.4, botDmg: 1, botBuild: 0.6, rarity: [30, 30, 22, 11, 7]
    }
];

export const BOT_NAMES = [
    'דני', 'יואב', 'מיכל', 'אורי', 'שירה', 'איתי', 'טל', 'עומר', 'נוי', 'גיל', 'רוני', 'עדי', 'אלון', 'ליה',
    'בן', 'יעל', 'עידו', 'מאיה', 'נדב', 'תמר', 'אביב', 'שקד', 'רועי', 'הילה', 'גפן', 'אריאל', 'צליל', 'אופק'
];

export const STORM_PHASES = [
    { wait: 55, shrink: 35, r: 150, dps: 1 },
    { wait: 35, shrink: 30, r: 90, dps: 2 },
    { wait: 30, shrink: 25, r: 52, dps: 4 },
    { wait: 25, shrink: 20, r: 26, dps: 7 },
    { wait: 20, shrink: 15, r: 11, dps: 10 },
    { wait: 15, shrink: 15, r: 0, dps: 15 }
];
