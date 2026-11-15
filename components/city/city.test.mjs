// Logic tests for the city game: world layout, physics, combat, bots, stages.
// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    FLOOR, MAX_FLOORS, PAD_H, SEA_Z, SEABED, SPAWN, generateWorld, groundAt, insideBuilding, levelY, locate, locationOf,
    resolveSolids, rng, stepActor, weaponForLevel
} from './world.js';
import { WEAPONS, WEAPON_ORDER, lineClear, rayActor, rayWorld, shoot } from './combat.js';
import { STAGES, applyEvent, currentStage, initialProgress, loadProgress, saveProgress, stageView } from './progress.js';
import { botLoadout, createBot, createBots, hurtBot, steerPoint, updateBot } from './bots.js';
import { CITIZENS, greeting, replyFor } from './dialog.js';

const world = generateWorld(11);
const walk = (a, tx, tz, seconds = 60) => {
    for (let t = 0; t < seconds * 60; t++) {
        const dx = tx - a.x, dz = tz - a.z, len = Math.hypot(dx, dz);
        if (len < 0.15) return true;
        stepActor(world, a, dx / len, dz / len, 6, 1 / 60);
    }
    return false;
};
const actor = (x, y, z) => ({ x, y, z, vy: 0, grounded: true });

test('the city has enterable towers up to floor 20', () => {
    assert.equal(world.buildings.length, 44);
    assert.ok(world.buildings.every((b) => b.floors >= 4 && b.floors <= MAX_FLOORS));
    assert.ok(world.buildings.some((b) => b.floors === MAX_FLOORS), 'one tower reaches floor 20');
    assert.ok(world.buildings.some((b) => b.floors >= 15));
    assert.ok(world.buildings.some((b) => b.stairs), 'some buildings keep an exterior stairway');
    assert.equal(new Set(world.buildings.map((b) => b.name)).size, 44);
});

test('every floor of every building holds a pickup, better weapons higher up', () => {
    for (const b of world.buildings) {
        const mine = world.pickups.filter((p) => p.building === b.index);
        assert.equal(mine.length, b.floors + 1);
        for (const p of mine) {
            assert.ok(p.x > b.x0 && p.x < b.x1 && p.z > b.z0 && p.z < b.z1);
            assert.equal(p.y, levelY(b, p.level));
            assert.ok(p.kind === 'med' || p.kind === weaponForLevel(p.level));
        }
    }
    assert.deepEqual([0, 3, 8, 12, 20].map(weaponForLevel), WEAPON_ORDER);
});

test('walls block, the doorway lets you in', () => {
    for (const b of world.buildings) {
        const side = actor(b.x0 - 3, PAD_H, b.cz);
        walk(side, b.cx, b.cz, 4);
        assert.ok(side.x < b.x0, `${b.name}: west wall holds`);
        const guest = actor(b.door.x, PAD_H, b.door.zOut + 1);
        assert.ok(walk(guest, b.door.x, b.cz, 8), `${b.name}: door is passable`);
        assert.equal(insideBuilding(world, guest.x, guest.z), b);
    }
});

test('floors, roofs and levels are walkable and named', () => {
    const b = world.buildings.find((x) => x.floors === MAX_FLOORS);
    for (let k = 0; k <= b.floors; k++) {
        const y = levelY(b, k);
        assert.equal(groundAt(world, b.cx, b.cz, y), y);
        assert.equal(locationOf(world, b.cx, y, b.cz).level, k);
    }
    assert.match(locate(world, b.cx, levelY(b, 20), b.cz), /קומה 20/);
    assert.match(locate(world, b.cx, b.h, b.cz), /גג/);
    assert.equal(b.h, MAX_FLOORS * FLOOR);
    // Jumping on a floor never reaches the one above.
    const a = actor(b.cx, levelY(b, 3), b.cz);
    stepActor(world, a, 0, 0, 0, 1 / 60, true);
    for (let t = 0; t < 120; t++) stepActor(world, a, 0, 0, 0, 1 / 60);
    assert.equal(a.y, levelY(b, 3));
});

test('an exterior stairway climbs to the roof', () => {
    const b = world.buildings.find((x) => x.stairs);
    const a = actor(b.x1 + 0.8, PAD_H, b.cz - 6);
    for (let k = 0; k < b.floors; k++) {
        const up = k % 2 === 0;
        assert.ok(walk(a, b.x1 + 0.8 + (k % 2) * 1.6, up ? b.cz + 4.4 : b.cz - 4.4, 10));
        assert.ok(walk(a, b.x1 + 0.8 + ((k + 1) % 2) * 1.6, up ? b.cz + 4.4 : b.cz - 4.4, 5));
    }
    assert.ok(Math.abs(a.y - b.h) < 0.01, `reached ${a.y}, roof ${b.h}`);
    assert.ok(walk(a, b.cx, b.cz, 10));
    assert.equal(locationOf(world, a.x, a.y, a.z).level, b.floors);
});

test('the stepped hill can be climbed to the summit', () => {
    const hill = world.blocks.find((x) => x.type === 'hill');
    const a = actor(SPAWN.x, SPAWN.y, SPAWN.z);
    assert.ok(walk(a, hill.cx, hill.cz, 20));
    assert.ok(Math.abs(a.y - hill.top) < 0.01);
    assert.match(locate(world, a.x, a.y, a.z), /פסגת/);
});

test('the sea: beach slopes down, the pier stays dry', () => {
    assert.equal(groundAt(world, 40, SEA_Z - 1, 0), 0);
    assert.equal(groundAt(world, 40, SEA_Z + 30, 0), SEABED);
    const swimmer = actor(40, 0, SEA_Z - 2);
    walk(swimmer, 40, SEA_Z + 30, 30);
    assert.equal(swimmer.y, SEABED);
    assert.ok(walk(swimmer, 40, SEA_Z - 2, 30), 'can walk back out');
    assert.equal(swimmer.y, 0);
    const onPier = actor(0, 0, SEA_Z - 6);
    assert.ok(walk(onPier, 0, SEA_Z + 40, 30));
    assert.equal(onPier.y, world.pier.top);
    assert.match(locate(world, 0, world.pier.top, SEA_Z + 20), /מזח/);
});

test('bullets stop at walls and floors, and hit actors', () => {
    const b = world.buildings[0];
    assert.ok(!lineClear(world, b.x0 - 5, 1, b.cz, b.cx, 1, b.cz), 'wall blocks sight');
    assert.ok(lineClear(world, b.door.x, 1, b.door.zOut + 3, b.door.x, 1, b.cz), 'doorway is open');
    assert.ok(!lineClear(world, b.cx, 1, b.cz, b.cx, FLOOR + 1, b.cz), 'slab blocks between floors');
    assert.ok(Math.abs(rayWorld(world, b.x0 - 5, 1, b.cz, 1, 0, 0, 100) - 5) < 1e-6);
    const target = { x: 0, y: 0, z: 10 };
    assert.equal(rayActor(0, 1, 0, 0, 0, 1, target).factor, 1);
    assert.equal(rayActor(0, 1.56, 0, 0, 0, 1, target).factor, 1.7, 'headshot');
    assert.equal(rayActor(0, 1, 0, 1, 0, 0, target), null);
    const street = { x: 22, y: 0, z: 10 };
    const pellets = shoot(world, [22, 1, 0], [0, 0, 1], WEAPONS.shotgun, [street], rng(1), 0);
    assert.equal(pellets.length, 8);
    assert.ok(pellets.every((p) => p.target === street && p.damage === WEAPONS.shotgun.dmg));
    for (const id of WEAPON_ORDER) assert.ok(WEAPONS[id].dmg > 0 && WEAPONS[id].mag > 0 && WEAPONS[id].rate > 0);
});

test('stages unlock weapons, cars and boats in order', () => {
    let s = initialProgress();
    const fire = (event, value, bots = true) => { const r = applyEvent(s, event, value, bots); s = r.state; return r.completed; };
    assert.equal(fire('floor', 9), null, 'wrong event does nothing');
    assert.ok(fire('summit', 1));
    assert.ok(s.weapons.includes('smg'));
    assert.equal(fire('floor', 4), null);
    assert.ok(fire('floor', 5));
    assert.deepEqual(s.cars, ['sport']);
    for (let n = 0; n < 4; n++) assert.equal(fire('crate'), null);
    assert.equal(stageView(s, true).progress, 4);
    assert.ok(fire('crate'));
    assert.deepEqual(s.boats, ['motor']);
    assert.equal(fire('roof', 14), null);
    assert.ok(fire('roof', 15));
    assert.equal(fire('sail', 299), null);
    assert.ok(fire('sail', 5));
    assert.deepEqual(s.boats, ['motor', 'speed']);
    assert.ok(fire('drive', 1000));
    assert.deepEqual(s.cars, ['sport', 'jeep']);
    assert.ok(fire('floor', 20));
    assert.equal(currentStage(s, true).event, 'kill');
    assert.equal(currentStage(s, false).event, 'crate', 'no-bots mode swaps the last stage');
    for (let n = 0; n < 9; n++) assert.equal(fire('kill'), null);
    assert.ok(fire('kill'));
    assert.deepEqual(s.weapons, ['pistol', 'smg', 'shotgun', 'sniper', 'rifle']);
    assert.equal(s.stage, STAGES.length);
    assert.ok(stageView(s, true).done);
    assert.equal(s.kills, 10);
});

test('progress survives storage, and bad storage is ignored', () => {
    const mem = new Map();
    const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
    const s = applyEvent(initialProgress(), 'summit').state;
    saveProgress(storage, s);
    assert.deepEqual(loadProgress(storage), s);
    assert.deepEqual(loadProgress({ getItem: () => '{broken' }), initialProgress());
    assert.deepEqual(loadProgress({ getItem: () => { throw new Error('blocked'); } }), initialProgress());
    saveProgress({ setItem: () => { throw new Error('full'); } }, s);
});

function runBot(bot, target, seconds, hooks = {}) {
    const rand = rng(77);
    let hits = 0, shots = 0;
    for (let t = 0; t < seconds * 60; t++) {
        updateBot(bot, 1 / 60, {
            world, target, time: t / 60, rand, stage: 0,
            onShot: (_b, _o, pellets) => { shots++; for (const p of pellets) if (p.target) hits += p.damage; }
        });
        if (hooks.until?.(bot, hits)) return { t: t / 60, hits, shots };
    }
    return { t: seconds, hits, shots };
}

test('a bot finds its way through the streets to the player', () => {
    const bot = createBot(0, rng(5));
    Object.assign(bot, { x: -154, z: -154 });
    const target = { x: 110, y: PAD_H, z: 120, dead: false, speed: 0 };
    const r = runBot(bot, target, 120, { until: (b) => Math.hypot(b.x - target.x, b.z - target.z) < 30 });
    assert.ok(r.t < 120, `still ${Math.hypot(bot.x - target.x, bot.z - target.z).toFixed(0)}m away`);
});

test('a bot enters a building and rides the elevator to the player’s floor', () => {
    const b = world.buildings.find((x) => x.floors >= 10);
    const bot = createBot(0, rng(5));
    Object.assign(bot, { x: b.door.x + 6, z: b.door.zOut + 5, hunter: true });
    const target = { x: b.cx + 2, y: levelY(b, 7), z: b.cz + 2, dead: false, speed: 0 };
    const r = runBot(bot, target, 90, { until: (bt) => locationOf(world, bt.x, bt.y, bt.z).level === 7 && locationOf(world, bt.x, bt.y, bt.z).b === b });
    assert.ok(r.t < 90, `bot ended at y=${bot.y.toFixed(1)} (${bot.x.toFixed(1)}, ${bot.z.toFixed(1)})`);
    const fight = runBot(bot, target, 20, { until: (_b, hits) => hits >= 100 });
    assert.ok(fight.hits >= 100, `only ${fight.hits} damage in 20s`);
});

test('a bot leaves a building by elevator and door', () => {
    const b = world.buildings.find((x) => x.floors >= 10);
    const bot = createBot(1, rng(9));
    Object.assign(bot, { x: b.cx, y: levelY(b, 6), z: b.cz });
    const goal = { x: b.door.x, y: PAD_H, z: b.door.zOut + 6 };
    for (let t = 0; t < 60 * 60; t++) {
        const p = steerPoint(world, bot, goal, 1 / 60);
        if (p) { const dx = p.x - bot.x, dz = p.z - bot.z, len = Math.hypot(dx, dz) || 1; stepActor(world, bot, dx / len, dz / len, 5.6, 1 / 60); }
        if (!insideBuilding(world, bot.x, bot.z) && Math.hypot(bot.x - goal.x, bot.z - goal.z) < 1) break;
    }
    assert.equal(insideBuilding(world, bot.x, bot.z), null);
    assert.ok(Math.hypot(bot.x - goal.x, bot.z - goal.z) < 1);
});

test('bots shoot to hit in the open, fall back when hurt, and respawn', () => {
    const bot = createBot(2, rng(3));
    Object.assign(bot, { x: 22, y: 0, z: 0 });
    const target = { x: 22, y: 0, z: 18, dead: false, speed: 0 };
    const r = runBot(bot, target, 15, { until: (_b, hits) => hits >= 100 });
    assert.ok(r.hits >= 100, `bot dealt ${r.hits} in 15s`);
    assert.equal(hurtBot(bot, 75, 20, target), false);
    assert.ok(bot.retreat > 0, 'retreats when low');
    assert.equal(hurtBot(bot, 80, 21, target), true);
    assert.ok(bot.dead);
    runBot(bot, target, 8);
    assert.ok(!bot.dead && bot.hp === 100, 'respawned');
    assert.ok(Math.hypot(bot.x - target.x, bot.z - target.z) > 60, 'respawns away from the player');
});

test('bots do not shoot through walls or at a dead player', () => {
    const b = world.buildings[0];
    const bot = createBot(0, rng(3));
    Object.assign(bot, { x: b.x0 - 6, y: 0, z: b.cz, hunter: false });
    const hidden = { x: b.cx, y: PAD_H, z: b.cz, dead: false, speed: 0 };
    assert.equal(runBot(bot, hidden, 1.5).shots, 0);
    const bot2 = createBot(0, rng(3));
    Object.assign(bot2, { x: 22, y: 0, z: 0 });
    assert.equal(runBot(bot2, { x: 22, y: 0, z: 12, dead: true, speed: 0 }, 5).shots, 0);
});

test('bot squads scale with the stage', () => {
    const squad = createBots(8, rng(1), 0, SPAWN);
    assert.equal(squad.length, 8);
    assert.ok(squad.every((b) => Math.hypot(b.x - SPAWN.x, b.z - SPAWN.z) > 60));
    assert.ok(botLoadout(0, 7).skill < botLoadout(0, 0).skill);
    assert.ok(WEAPON_ORDER.indexOf(botLoadout(3, 7).weapon) > WEAPON_ORDER.indexOf(botLoadout(0, 0).weapon));
});

test('solids only block within their height range', () => {
    const b = world.buildings[0];
    assert.ok(resolveSolids(world, b.x0 + 0.1, b.cz, PAD_H, 0.35).hit);
    assert.ok(!resolveSolids(world, b.x0 + 0.1, b.cz, b.h, 0.35).hit, 'free to walk on the roof edge');
    assert.ok(resolveSolids(world, b.door.x, b.z1 - 0.1, 3, 0.35).hit, 'lintel above the door blocks upstairs');
});

test('citizens always have something to say', () => {
    for (const c of CITIZENS) {
        assert.ok(greeting(c).includes(c.name));
        for (const q of ['שלום', 'איפה המסוק?', 'מה השעה', 'בלה בלה']) assert.ok(replyFor(c, q).length > 3);
    }
});
