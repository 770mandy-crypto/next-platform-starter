// The map of "Egypt: the journey". Pure data and rules, no browser APIs,
// so the same file drives the 3D scene (main.js) and the tests.
// Units are roughly metres. x runs east, z runs south (north is -z).

export const MAP = { half: 320, spawn: { x: 0, z: 150 } };

const rect = (x0, x1, z0, z1) => ({ x0, x1, z0, z1 });
const box = (x, z, w, d) => rect(x - w / 2, x + w / 2, z - d / 2, z + d / 2);

// The Nile runs west-east across the whole map. Only the bridge crosses it.
export const RIVER = { z0: -54, z1: -26, bridge: { x0: -8, x1: 8, z0: -54, z1: -26 } };
export const RIVER_RECTS = [
    rect(-MAP.half, RIVER.bridge.x0, RIVER.z0, RIVER.z1),
    rect(RIVER.bridge.x1, MAP.half, RIVER.z0, RIVER.z1),
];

// City wall around the map, with a gate in the middle of the south side.
const H = MAP.half;
const T = 7;
export const WALLS = [
    rect(-H, -H + T, -H, H),
    rect(H - T, H, -H, H),
    rect(-H, H, -H, -H + T),
    rect(-H, -12, H - T, H),
    rect(12, H, H - T, H),
];

// Temple-palace enclosure in the north-west, with a gate facing south.
export const PALACE = { x: -200, z: -180, x0: -262, x1: -138, z0: -226, z1: -134, gate: { x0: -212, x1: -188 } };
export const PALACE_WALLS = [
    rect(-262, -258, -226, -134),
    rect(-142, -138, -226, -134),
    rect(-262, -138, -226, -222),
    rect(-262, -212, -138, -134),
    rect(-188, -138, -138, -134),
];
export const PALACE_COLUMNS = [-250, -150].flatMap((x) => [-210, -195, -180, -165, -150].map((z) => ({ x, z })));

// The pyramid field in the north-east (base = side length, h = height).
export const PYRAMIDS = [
    { x: 120, z: -170, base: 110, h: 90 },
    { x: 235, z: -180, base: 80, h: 68 },
    { x: 290, z: -105, base: 44, h: 40 },
];
export const SPHINX = { x: 130, z: -95, len: 26, w: 8 };
export const OBELISK = { x: 30, z: -200, s: 4 };
export const POND = { x: 250, z: 140, w: 28, d: 24 };
export const WELL = { x: -100, z: 12 };
export const STALLS = [[70, 80], [100, 80], [70, 105], [100, 105]].map(([x, z]) => ({ x, z }));

// Goshen: the mud-brick village south-west of the river.
export const HOUSES = [];
for (const z of [40, 68, 96, 124]) {
    for (const x of [-230, -200, -170, -140]) {
        if ((x === -230 || x === -140) && z === 124) continue;
        HOUSES.push({ x, z, w: 12, d: 10, h: 7, white: (x + z) % 3 === 0 });
    }
}

// Fields between the river and the village. Crops grow here.
export const FIELDS = [
    { id: 'field-a', x: -150, z: -12, w: 60, d: 20 },
    { id: 'field-b', x: -40, z: -12, w: 50, d: 20 },
];

// Everything the player can walk into or bump against.
export const OBSTACLES = [
    ...WALLS,
    ...RIVER_RECTS,
    ...PALACE_WALLS,
    ...PYRAMIDS.map((p) => box(p.x, p.z, p.base, p.base)),
    box(SPHINX.x, SPHINX.z, SPHINX.len, SPHINX.w),
    box(OBELISK.x, OBELISK.z, OBELISK.s, OBELISK.s),
    box(POND.x, POND.z, POND.w, POND.d),
    ...STALLS.map((s) => box(s.x, s.z, 8, 5)),
    box(WELL.x, WELL.z, 6, 6),
    ...HOUSES.map((h) => box(h.x, h.z, h.w, h.d)),
];

// Places people can visit. Visiting one for the first time "discovers" it.
export const LANDMARKS = [
    { id: 'village', name: 'כפר גושן', x: -170, z: 90, r: 60 },
    { id: 'palace', name: 'ארמון הפרעה', x: -200, z: -180, r: 55 },
    { id: 'pyramids', name: 'הפירמידות בגיזה', x: 160, z: -165, r: 95 },
    { id: 'sphinx', name: 'הספינקס', x: 130, z: -95, r: 20 },
    { id: 'obelisk', name: 'האובליסק', x: 30, z: -200, r: 20 },
    { id: 'market', name: 'השוק', x: 90, z: 95, r: 45 },
    { id: 'river-bridge', name: 'גשר הנילוס', x: 0, z: -40, r: 14 },
    { id: 'oasis', name: 'נווה המדבר', x: 250, z: 140, r: 30 },
    { id: 'gate-south', name: 'שער הדרום', x: 0, z: 300, r: 24 },
];
export const LANDMARK_IDS = LANDMARKS.map((l) => l.id);

// People you can talk to. `say` is what they answer, per faction.
export const NPCS = [
    {
        id: 'vizier', name: 'הוזיר', x: -200, z: -160, robe: 0x2a5db0, headgear: 'nemes',
        say: { egypt: 'הפרעה מחכה לתבואה. אל תאחר.', hebrew: 'אין כניסה לחצר הזאת בלי רשות.' },
    },
    {
        id: 'elder', name: 'הזקן', x: -175, z: 58, robe: 0xd8c9a8, headgear: 'band',
        say: { egypt: 'גושן היא ארץ טובה. שמור עליה.', hebrew: 'ברוך הבא לגושן. המים רחוקים, והדרך ארוכה.' },
    },
    {
        id: 'mother', name: 'האם', x: -140, z: 55, robe: 0x9c4a6b, headgear: 'band',
        say: { egypt: 'השכנים מספרים שאתה מחפש עבודה.', hebrew: 'הילדים צמאים. בבקשה, תביא מים.' },
    },
    {
        id: 'farmer', name: 'האיכר', x: -128, z: -6, robe: 0x7d9ba8, headgear: 'band',
        say: { egypt: 'השדה הזה מאכיל את כל מצרים.', hebrew: 'מי שצריך קש לבנים, יבוא מהשדה השני.' },
    },
    {
        id: 'merchant', name: 'הסוחר', x: 85, z: 92, robe: 0xc0392b, headgear: 'none',
        say: { egypt: 'בוא תראה את הסחורה מהנילוס!', hebrew: 'יש לי בדים מכל הארץ, בוא תסתכל.' },
    },
];

// Things you pick up with E. Each press adds one of `item` to the pack.
export const PICKUPS = [
    { id: 'well', item: 'water', label: 'מים', x: -100, z: 19 },
    { id: 'field-a', item: 'grain', label: 'תבואה', x: -150, z: -12 },
    { id: 'field-b', item: 'straw', label: 'קש', x: -40, z: -12 },
];

// Background people who wander near their home. They have no quests.
export const VILLAGERS = [
    { x: -190, z: 110, r: 14, robe: 0xc9b38a },
    { x: -150, z: 108, r: 12, robe: 0x7d9ba8 },
    { x: -110, z: 60, r: 10, robe: 0xd9a86c },
    { x: -210, z: 30, r: 10, robe: 0xb0603c },
    { x: -130, z: 140, r: 12, robe: 0xe8e0c8 },
    { x: 90, z: 115, r: 14, robe: 0xc9b38a },
    { x: 60, z: 85, r: 10, robe: 0x5a7d52 },
    { x: 120, z: 80, r: 10, robe: 0x9c4a6b },
    { x: -20, z: 220, r: 40, robe: 0xd0b48a },
];

// Distance from a point to a rectangle (0 when inside).
export function distToRect(x, z, b) {
    const dx = Math.max(b.x0 - x, 0, x - b.x1);
    const dz = Math.max(b.z0 - z, 0, z - b.z1);
    return Math.hypot(dx, dz);
}

// True when a circle of radius `margin` at (x, z) touches no obstacle and stays inside the walls.
export function isFree(x, z, margin = 0) {
    const limit = MAP.half - margin;
    if (Math.abs(x) > limit || Math.abs(z) > limit) return false;
    return OBSTACLES.every((b) => {
        const inside = x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1;
        return !inside && distToRect(x, z, b) >= margin;
    });
}

// Pushes a circle of radius r out of every obstacle it overlaps.
export function pushOut(x, z, r) {
    for (const b of OBSTACLES) {
        const cx = Math.min(Math.max(x, b.x0), b.x1);
        const cz = Math.min(Math.max(z, b.z0), b.z1);
        const dx = x - cx;
        const dz = z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-9) {
            const d = Math.sqrt(d2);
            const push = (r - d) / d;
            x += dx * push;
            z += dz * push;
        } else {
            // The centre is inside the box: leave by the nearest side.
            const left = x - b.x0;
            const right = b.x1 - x;
            const down = z - b.z0;
            const up = b.z1 - z;
            const m = Math.min(left, right, down, up);
            if (m === left) x = b.x0 - r;
            else if (m === right) x = b.x1 + r;
            else if (m === down) z = b.z0 - r;
            else z = b.z1 + r;
        }
    }
    const limit = MAP.half - 0.5;
    return { x: Math.min(Math.max(x, -limit), limit), z: Math.min(Math.max(z, -limit), limit) };
}

// The closest item within `range` of (x, z), or null.
export function nearest(list, x, z, range) {
    let best = null;
    let bestD = range;
    for (const item of list) {
        const d = Math.hypot(item.x - x, item.z - z);
        if (d <= bestD) {
            best = item;
            bestD = d;
        }
    }
    return best;
}

// Landmarks whose circle contains (x, z).
export function landmarksAt(x, z) {
    return LANDMARKS.filter((l) => Math.hypot(l.x - x, l.z - z) <= l.r);
}
