// Deterministic layout of the open city: blocks, hollow buildings with doors,
// floors and elevators, exterior stairways, the stepped hill, parks, the helipad
// plaza, the sea with its pier, and the pickups on every floor.
// Pure data and pure physics helpers: no rendering, so the engine, the bots and
// the tests all share one source of truth.

export const N = 7;
export const BLOCK = 34;
export const ROAD = 10;
export const CELL = BLOCK + ROAD;
export const HALF = (N * CELL) / 2;
export const FLOOR = 3.5;
export const PAD_H = 0.15;
export const WALL = 0.3;
export const MAX_FLOORS = 21; // storeys: ground floor plus floors 1..20
export const SEA_Z = HALF + 18;
export const SEABED = -1.1;
export const WATER_Y = -0.35;
export const STEP_UP = 0.6;
/** Centre lines of the roads, in both directions. */
export const LINES = Array.from({ length: N + 1 }, (_, k) => (k - N / 2) * CELL);
export const SPAWN = { x: 0, y: PAD_H, z: 20.5 };

const MID = (N - 1) / 2;
const PAD_HALF = BLOCK / 2;

const FACADES = ['#d9cbb5', '#b9aa97', '#c7bda9', '#84999c', '#e3d8c4', '#8d9b99', '#bba88b', '#9aa6a3', '#c6bcae', '#77888d'];
const BUILDING_NAMES = [
    'מגדל הכרמל', 'בית הנחל', 'מרכז השקד', 'בית המעיין', 'מגדל החרוב', 'בית הלבונה', 'מגדל הגלעד', 'בית הסביון',
    'מרכז הנרקיס', 'בית הצוף', 'מגדל התבור', 'בית האירוס', 'מגדל הערבה', 'בית הכלנית', 'מרכז היסמין', 'בית הרותם',
    'מגדל השרון', 'בית החצב', 'מגדל הגולן', 'בית הדולב', 'מרכז האשל', 'בית הלוטם', 'מגדל הנגב', 'בית המורן',
    'מגדל העמק', 'בית הזמיר', 'מרכז הסנונית', 'בית הדרור', 'מגדל הירדן', 'בית השחף', 'מגדל הארבל', 'בית העפרוני',
    'מרכז החוחית', 'בית הנשר', 'מגדל הגלבוע', 'בית היעל', 'מגדל החרמון', 'בית הצבי', 'מרכז האיילה', 'בית הדישון',
    'מגדל הבשן', 'בית הלילך', 'מגדל הרקפת', 'בית הנורית'
];
const USES = ['מגורים', 'משרדים', 'בית קפה', 'ספרייה', 'גלריה', 'סדנאות', 'מלון', 'אולפנים'];
const STREETS_NS = ['שדרת הברושים', 'רחוב הגפן', 'רחוב התאנה', 'שדרת המעלות', 'רחוב הרימון', 'רחוב הזית', 'רחוב התמר', 'שדרת הדקלים'];
const STREETS_EW = ['דרך ההר', 'רחוב השחר', 'רחוב האופק', 'שדרת המצפה', 'רחוב הרוח', 'רחוב הגשם', 'רחוב הכוכבים', 'טיילת הים'];

export function rng(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

const SPECIAL = {
    '3,3': { type: 'hill', label: 'גבעת המדרגות' },
    '1,5': { type: 'helipad', label: 'רחבת המסוקים' },
    '5,1': { type: 'park', label: 'גן האלונים' },
    '2,2': { type: 'park', label: 'גן השקדיות' },
    '5,4': { type: 'park', label: 'גן הנחל' }
};

/** Which weapon a crate on a given level holds: better gear waits higher up. */
export function weaponForLevel(level) {
    if (level < 2) return 'pistol';
    if (level < 6) return 'smg';
    if (level < 10) return 'shotgun';
    if (level < 15) return 'rifle';
    return 'sniper';
}

/** Height of the walkable surface of a level; level === floors means the roof. */
export function levelY(b, level) {
    if (level >= b.floors) return b.h;
    return level <= 0 ? PAD_H : level * FLOOR;
}

export function generateWorld(seed = 11) {
    const r = rng(seed);
    const surfaces = []; // walkable tops: flat or ramps
    const solids = []; // things that block sideways movement
    const blocks = [];
    const buildings = [];
    const stepBoxes = [];
    const hillBoxes = [];
    const trees = [];
    const lamps = [];
    const pickups = [];
    let nameIndex = 0;

    const flat = (x0, z0, x1, z1, h, slab = false) => surfaces.push({ x0, z0, x1, z1, a: h, b: h, axis: 'x', slab });
    const solid = (x0, z0, x1, z1, h, y0 = 0) => solids.push({ x0, z0, x1, z1, h, y0 });

    // Pass 1: decide what stands on every block.
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            const cx = (i - MID) * CELL;
            const cz = (j - MID) * CELL;
            const special = SPECIAL[`${i},${j}`];
            const block = { i, j, cx, cz, type: special?.type || 'building', label: special?.label || '' };
            blocks.push(block);
            if (block.type !== 'building') continue;
            const size = 15 + Math.floor(r() * 3) * 3;
            const floors = 4 + Math.floor(r() * (MAX_FLOORS - 3));
            block.building = {
                index: buildings.length, size, floors, cx: cx - 2, cz,
                color: FACADES[Math.floor(r() * FACADES.length)],
                name: BUILDING_NAMES[nameIndex++ % BUILDING_NAMES.length],
                use: USES[Math.floor(r() * USES.length)],
                variant: Math.floor(r() * 3)
            };
            block.label = block.building.name;
            buildings.push(block.building);
        }
    }
    // The skyline always has one full-height tower so floor 20 exists.
    if (!buildings.some((b) => b.floors === MAX_FLOORS)) buildings.reduce((a, b) => (b.floors > a.floors ? b : a)).floors = MAX_FLOORS;

    // Pass 2: turn the plan into collision geometry.
    for (const block of blocks) {
        const { cx, cz } = block;
        flat(cx - PAD_HALF, cz - PAD_HALF, cx + PAD_HALF, cz + PAD_HALF, PAD_H);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) lamps.push({ x: cx + sx * 16.2, z: cz + sz * 16.2 });

        if (block.type === 'hill') {
            // A stepped pyramid: every terrace is one stair-step higher than the last.
            for (let k = 0; k < 13; k++) {
                const half = 16 - k;
                const top = PAD_H + (k + 1) * 0.5;
                solid(cx - half, cz - half, cx + half, cz + half, top);
                flat(cx - half, cz - half, cx + half, cz + half, top);
                hillBoxes.push({ x: cx, y: top - 0.25, z: cz, sx: half * 2, sy: 0.5, sz: half * 2, color: k % 2 ? '#b7ab95' : '#c9bea8' });
            }
            block.top = PAD_H + 13 * 0.5;
            continue;
        }
        if (block.type === 'helipad') continue;
        if (block.type === 'park') {
            for (let t = 0; t < 11; t++) trees.push({ x: cx + (r() - 0.5) * 26, z: cz + (r() - 0.5) * 26, s: 0.85 + r() * 0.7 });
            continue;
        }

        const b = block.building;
        const half = b.size / 2;
        Object.assign(b, { x0: b.cx - half, x1: b.cx + half, z0: cz - half, z1: cz + half, h: b.floors * FLOOR });
        b.stairs = b.floors <= 8;
        b.door = { x: b.cx, half: 1.2, h: 2.6, zOut: b.z1 + 1.6, zIn: b.z1 - 1.6 };
        b.lift = { x: b.x0 + 1.9, z: b.z0 + 1.9 };

        // Hollow shell: four walls, with a doorway in the south wall.
        solid(b.x0, b.z0, b.x0 + WALL, b.z1, b.h);
        solid(b.x1 - WALL, b.z0, b.x1, b.z1, b.h);
        solid(b.x0, b.z0, b.x1, b.z0 + WALL, b.h);
        solid(b.x0, b.z1 - WALL, b.door.x - b.door.half, b.z1, b.h);
        solid(b.door.x + b.door.half, b.z1 - WALL, b.x1, b.z1, b.h);
        solid(b.door.x - b.door.half, b.z1 - WALL, b.door.x + b.door.half, b.z1, b.h, b.door.h);
        for (let k = 1; k < b.floors; k++) flat(b.x0, b.z0, b.x1, b.z1, k * FLOOR, true);
        flat(b.x0, b.z0, b.x1, b.z1, b.h, true);

        // Something to find on every floor and on the roof.
        for (let k = 0; k <= b.floors; k++) {
            let x, z;
            do {
                x = b.x0 + 2 + r() * (b.size - 4);
                z = b.z0 + 2 + r() * (b.size - 4);
            } while (Math.hypot(x - b.lift.x, z - b.lift.z) < 3.2 || (k === 0 && Math.abs(x - b.door.x) < 2 && z > b.z1 - 4));
            pickups.push({ id: pickups.length, building: b.index, level: k, x, z, y: levelY(b, k), kind: r() < 0.24 ? 'med' : weaponForLevel(k) });
        }

        if (b.stairs) {
            // Two-lane exterior stairway on the +x wall: flights alternate lanes and
            // direction, joined by landings, and the last landing meets the roof.
            const lane = 1.6;
            const zs = cz - 3.5;
            const ze = cz + 3.5;
            for (let k = 0; k < b.floors; k++) {
                const y0 = k * FLOOR;
                const y1 = y0 + FLOOR;
                const lx = b.x1 + (k % 2) * lane;
                const up = k % 2 === 0;
                surfaces.push({ x0: lx, x1: lx + lane, z0: zs, z1: ze, axis: 'z', a: up ? y0 : y1, b: up ? y1 : y0 });
                for (let s = 0; s < 7; s++) {
                    const z = up ? zs + s + 0.5 : ze - s - 0.5;
                    stepBoxes.push({ x: lx + lane / 2, y: y0 + (s + 1) * 0.5 - 0.25, z, sx: lane, sy: 0.5, sz: 1 });
                }
                const lz0 = up ? ze : zs - 1.8;
                flat(b.x1, lz0, b.x1 + lane * 2, lz0 + 1.8, y1);
                stepBoxes.push({ x: b.x1 + lane, y: y1 - 0.1, z: lz0 + 0.9, sx: lane * 2, sy: 0.2, sz: 1.8 });
            }
        }
        if (r() < 0.6) trees.push({ x: cx - 14.5, z: cz + 14.5, s: 0.8 + r() * 0.4 });
        if (r() < 0.6) trees.push({ x: cx - 14.5, z: cz - 14.5, s: 0.8 + r() * 0.4 });
    }

    // The sea lies south of the city: a sloping beach and a pier to moor boats at.
    const pier = { x0: -3, x1: 3, z0: SEA_Z - 3, z1: SEA_Z + 42, top: 0.5 };
    surfaces.push({ x0: -900, x1: 900, z0: SEA_Z, z1: SEA_Z + 12, axis: 'z', a: 0, b: SEABED });
    flat(pier.x0, pier.z0, pier.x1, pier.z1, pier.top);
    solid(pier.x0, pier.z0, pier.x1, pier.z1, pier.top, -3);

    // Boxes that stop bullets and block lines of sight: walls, slabs, terraces.
    const rayBoxes = [];
    for (const s of solids) rayBoxes.push([s.x0, s.y0, s.z0, s.x1, s.h, s.z1]);
    for (const s of surfaces) if (s.slab) rayBoxes.push([s.x0, s.a - 0.25, s.z0, s.x1, s.a, s.z1]);

    return { surfaces, solids, blocks, buildings, stepBoxes, hillBoxes, trees, lamps, pickups, pier, rayBoxes };
}

/** Highest walkable surface under (x, z) that can be reached from height y. */
export function groundAt(world, x, z, y, stepUp = STEP_UP) {
    let best = z > SEA_Z ? SEABED : 0;
    const list = world.surfaces;
    for (let n = 0; n < list.length; n++) {
        const s = list[n];
        if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) continue;
        let h = s.a;
        if (s.a !== s.b) {
            const t = s.axis === 'z' ? (z - s.z0) / (s.z1 - s.z0) : (x - s.x0) / (s.x1 - s.x0);
            h = s.a + (s.b - s.a) * t;
        }
        if (h <= y + stepUp && h > best) best = h;
    }
    return best;
}

/** Push a circle of radius rad, standing at height y, out of every solid in its way. */
export function resolveSolids(world, x, z, y, rad, stepUp = STEP_UP) {
    let hit = false;
    const list = world.solids;
    for (let n = 0; n < list.length; n++) {
        const s = list[n];
        if (y >= s.h - stepUp || y + 1.7 <= s.y0) continue;
        if (x <= s.x0 - rad || x >= s.x1 + rad || z <= s.z0 - rad || z >= s.z1 + rad) continue;
        const dl = x - (s.x0 - rad);
        const dr = s.x1 + rad - x;
        const db = z - (s.z0 - rad);
        const df = s.z1 + rad - z;
        const m = Math.min(dl, dr, db, df);
        if (m === dl) x = s.x0 - rad;
        else if (m === dr) x = s.x1 + rad;
        else if (m === db) z = s.z0 - rad;
        else z = s.z1 + rad;
        hit = true;
    }
    return { x, z, hit };
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/**
 * Walk an actor ({x, y, z, vy, grounded}) one step in direction (dx, dz):
 * walls, steps, stairs, gravity, jumping and wading through water.
 */
export function stepActor(world, a, dx, dz, speed, dt, jump = false) {
    const wasGrounded = a.grounded;
    if (a.y < -0.5) speed *= 0.5;
    const out = resolveSolids(world, a.x + dx * speed * dt, a.z + dz * speed * dt, a.y, 0.35);
    const nx = clamp(out.x, -HALF - 70, HALF + 70);
    const nz = clamp(out.z, -HALF - 70, SEA_Z + 70);
    if (jump && a.grounded) {
        a.vy = 8.6;
        a.grounded = false;
    }
    a.vy -= 25 * dt;
    let ny = a.y + a.vy * dt;
    const g = groundAt(world, nx, nz, Math.max(a.y, ny));
    if (ny <= g || (wasGrounded && a.vy <= 0 && ny - g < 0.75)) {
        ny = g;
        a.vy = 0;
        a.grounded = true;
    } else a.grounded = false;
    a.x = nx;
    a.y = ny;
    a.z = nz;
    return out.hit;
}

/** The building whose footprint contains (x, z), if any. */
export function insideBuilding(world, x, z) {
    const i = Math.round(x / CELL + MID);
    const j = Math.round(z / CELL + MID);
    if (i < 0 || j < 0 || i >= N || j >= N) return null;
    const b = world.blocks[i * N + j].building;
    return b && x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 ? b : null;
}

/** Building and level an actor is in or on; level === floors means the roof. */
export function locationOf(world, x, y, z) {
    const b = insideBuilding(world, x, z);
    if (!b || y > b.h + 3) return { b: null, level: 0 };
    return { b, level: y >= b.h - STEP_UP ? b.floors : Math.max(0, Math.round(y / FLOOR)) };
}

export const levelName = (b, level) => (level >= b.floors ? 'גג' : level === 0 ? 'קומת קרקע' : `קומה ${level}`);

function districtOf(x, z) {
    if (z < -CELL * 1.5) return 'הרובע הצפוני';
    if (z > CELL * 1.5) return 'הרובע הדרומי';
    if (x < -CELL * 1.5) return 'הרובע המערבי';
    if (x > CELL * 1.5) return 'הרובע המזרחי';
    return 'מרכז העיר';
}

/** Human-readable name of where (x, y, z) is, for the location pill. */
export function locate(world, x, y, z) {
    const p = world.pier;
    if (x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1 && y > 0.2) return 'מזח הסירות · חוף הים';
    if (z > SEA_Z + 5) return 'הים הפתוח';
    if (z > HALF + ROAD) return 'חוף הים';
    if (Math.abs(x) > HALF + ROAD || z < -HALF - ROAD) return 'שולי העיר';
    const i = clamp(Math.round(x / CELL + MID), 0, N - 1);
    const j = clamp(Math.round(z / CELL + MID), 0, N - 1);
    const cx = (i - MID) * CELL;
    const cz = (j - MID) * CELL;
    const district = districtOf(x, z);
    const dx = Math.abs(x - cx);
    const dz = Math.abs(z - cz);
    if (dx <= PAD_HALF && dz <= PAD_HALF) {
        const block = world.blocks[i * N + j];
        const b = block.building;
        if (b) {
            const loc = locationOf(world, x, y, z);
            if (loc.b) return `${b.name} · ${levelName(b, loc.level)}`;
            if (y > 1.5) return `מדרגות ${b.name} · קומה ${Math.round(y / FLOOR)}`;
            return `${b.name} (${b.use}) · ${district}`;
        }
        if (block.type === 'hill' && y > block.top - 0.3) return `פסגת ${block.label} · ${district}`;
        return `${block.label} · ${district}`;
    }
    if (dx > dz) return `${STREETS_NS[x > cx ? i + 1 : i]} · ${district}`;
    return `${STREETS_EW[z > cz ? j + 1 : j]} · ${district}`;
}
