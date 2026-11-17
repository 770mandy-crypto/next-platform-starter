import { buyItem, shopList } from './progress.js';
import { CABLE_HEIGHT, cablePose, cableSamples, cableSegments, cableStops } from './cable.js';
// Logic tests for the city game: world layout, physics, combat, bots, stages.
// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    FLOOR, MAX_FLOORS, PAD_H, SEA_Z, SEABED, SPAWN, generateWorld, groundAt, insideBuilding, levelY, locate, locationOf,
    resolveSolids, rng, stepActor, weaponForLevel
} from './world.js';
import { WEAPONS, WEAPON_ORDER, lineClear, rayActor, rayWorld, shoot } from './combat.js';
import { STAGES, applyEvent, currentStage, heliUnlocked, initialProgress, loadProgress, saveProgress, stageView } from './progress.js';
import { checkAdminCode } from './admin.js';
import { botLoadout, createBot, createBots, hurtBot, steerPoint, updateBot } from './bots.js';
import { CITIZENS, ambientLine, greeting, panicLine, replyFor } from './dialog.js';
import { clearWanted, createForce, driveCar, escapeTime, hitOfficer, hostile, raiseWanted, reportGunfire, updateForce } from './police.js';
import { BUSINESS_TYPES, LINES } from './world.js';

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

test('stages unlock weapons, boats, the helicopter and cash in order', () => {
    let s = initialProgress();
    const fire = (event, value, bots = true) => { const r = applyEvent(s, event, value, bots); s = r.state; return r.completed; };
    assert.equal(heliUnlocked(s), false, 'no helicopter during stage 1');
    assert.equal(fire('floor', 9), null, 'wrong event does nothing');
    assert.ok(fire('summit', 1));
    assert.ok(s.weapons.includes('smg'));
    assert.ok(heliUnlocked(s), 'helicopter from stage 2');
    assert.equal(fire('floor', 4), null);
    assert.ok(fire('floor', 5));
    assert.equal(s.cash, 5000);
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
    assert.equal(s.cash, 15000);
    assert.ok(fire('floor', 20));
    assert.equal(currentStage(s, true).event, 'crate');
    for (let n = 0; n < 19; n++) assert.equal(fire('crate'), null);
    assert.ok(fire('crate'));
    assert.deepEqual(s.weapons, ['pistol', 'smg', 'shotgun', 'sniper', 'rifle']);
    for (let n = 0; n < 2; n++) assert.equal(fire('heist'), null);
    assert.ok(fire('heist'));
    assert.equal(s.cash, 35000);
    assert.equal(fire('escape', 2), null, 'a two-star escape is not enough');
    assert.ok(fire('escape', 3));
    assert.equal(s.cash, 60000, 'cash bonus');
    assert.equal(s.heists, 3);
    assert.equal(s.stage, STAGES.length);
    assert.ok(stageView(s, true).done);
    assert.deepEqual(s.cars, [], 'cars are free, not rewards');
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

test('businesses: a safe in the back of the ground floor, reachable and named', () => {
    assert.equal(world.businesses.length, 44, 'a business in every building');
    assert.equal(new Set(world.businesses.map((b) => b.name)).size, 44, 'every business has its own name');
    assert.deepEqual(new Set(world.businesses.map((b) => b.type)), new Set(BUSINESS_TYPES.map((t) => t.id)));
    for (const biz of world.businesses) {
        const b = world.buildings[biz.building];
        assert.equal(b.business, biz.id);
        assert.ok(biz.safe.x < b.x1 && biz.safe.z > b.z0, 'safe inside');
        assert.ok(resolveSolids(world, biz.safe.x, biz.safe.z, PAD_H, 0.35).hit, 'the safe is solid');
        const a = actor(b.door.x, PAD_H, b.door.zOut + 1);
        assert.ok(walk(a, b.door.x, b.cz, 8));
        walk(a, biz.safe.x - 1.2, biz.safe.z + 1.2, 8);
        assert.ok(Math.hypot(a.x - biz.safe.x, a.z - biz.safe.z) < 1.9, `${biz.name}: can stand at the safe`);
        assert.match(locate(world, a.x, a.y, a.z), new RegExp(biz.name));
        assert.ok(biz.cash[0] > 0 && biz.crack > 0 && biz.heat >= 1);
    }
    assert.ok(!world.pickups.some((p) => p.level === 0 && world.buildings[p.building].business !== null
        && Math.hypot(p.x - world.businesses[world.buildings[p.building].business].safe.x, p.z - world.businesses[world.buildings[p.building].business].safe.z) < 2.5), 'no crate on the safe');
});

function runForce(force, player, seconds, hooks = {}) {
    const rand = rng(21);
    const log = { shots: 0, hits: 0, arrests: 0, escapes: [], rams: 0 };
    for (let t = 0; t < seconds * 60; t++) {
        updateForce(force, 1 / 60, {
            world, player, target: player, time: t / 60, rand,
            onShot: (_o, _origin, pellets) => { log.shots++; for (const p of pellets) if (p.target) log.hits++; },
            onArrest: () => log.arrests++, onEscape: (l) => log.escapes.push(l), onRam: () => log.rams++
        });
        if (hooks.until?.(force, log)) break;
    }
    return log;
}

test('police cars drive the street grid to a crime scene', () => {
    const car = { x: LINES[0], y: 0, z: LINES[0], yaw: 0, speed: 0, path: null, replan: 0, stuckT: 0, stuckX: 0, stuckZ: 0, reverseT: 0 };
    const goal = { x: LINES[6], y: 0, z: LINES[5] };
    let t = 0;
    for (; t < 60 * 60 && Math.hypot(car.x - goal.x, car.z - goal.z) > 6; t++) driveCar(world, car, goal, 1 / 60, 27);
    assert.ok(t < 60 * 60, `car stuck at ${car.x.toFixed(0)}, ${car.z.toFixed(0)}`);
});

test('a robbery brings the police; at one star they come to arrest, not to shoot', () => {
    const force = createForce();
    assert.equal(force.cars.length, 5, 'five patrol cars');
    assert.equal(force.officers.filter((o) => o.beat).length, 4, 'four officers on the beat');
    const player = { x: 22, y: 0, z: 0, dead: false, speed: 0, onFoot: true, vehicleSpeed: 0 };
    raiseWanted(force, 1);
    assert.equal(hostile(force), false);
    const log = runForce(force, player, 90, { until: (_f, l) => l.arrests > 0 });
    assert.equal(log.arrests, 1, 'arrested');
    assert.equal(log.shots, 0, 'no shots at one star');
    assert.equal(force.level, 0, 'wanted cleared by the arrest');
});

test('at three stars officers get out and open fire', () => {
    const force = createForce();
    const player = { x: 22, y: 0, z: 0, dead: false, speed: 0, onFoot: true, vehicleSpeed: 0 };
    raiseWanted(force, 3);
    assert.ok(hostile(force));
    const log = runForce(force, player, 90, { until: (_f, l) => l.hits >= 3 });
    assert.ok(log.hits >= 3, `only ${log.hits} hits`);
    assert.ok(force.officers.length >= 2, 'officers on foot');
});

test('staying out of sight long enough loses the police', () => {
    const force = createForce();
    const player = { x: 0, y: -0.35, z: SEA_Z + 220, dead: false, speed: 10, onFoot: false, vehicleSpeed: 12 };
    raiseWanted(force, 2);
    const log = runForce(force, player, escapeTime(2) + 30, { until: (_f, l) => l.escapes.length > 0 });
    assert.deepEqual(log.escapes, [2]);
    assert.equal(force.level, 0);
    runForce(force, player, 20);
    assert.ok(force.cars.every((c) => c.patrol || c.parked) && force.officers.every((o) => o.beat), 'units stand down');
});

test('shooting at the police makes it worse; gunfire near a patrol earns a star', () => {
    const force = createForce();
    const p = force.cars[0];
    assert.ok(reportGunfire(force, p.x + 10, p.z));
    assert.equal(force.level, 1);
    assert.ok(!reportGunfire(createForce(0), 500, 500));
    force.officers.push({ ...createBot(1, rng(1)), police: true, x: 0, z: 0 });
    hitOfficer(force, force.officers[0], 30, 1, { x: 0, y: 0, z: 0 });
    assert.ok(force.aggressive && force.level === 2 && hostile(force));
    hitOfficer(force, force.officers[0], 200, 2, { x: 0, y: 0, z: 0 });
    assert.equal(force.level, 3, 'killing an officer adds a star');
    clearWanted(force);
    assert.equal(force.level, 0);
    assert.ok(!force.aggressive);
});

test('with no crime the police patrol: cars drive, beat officers walk, nobody shoots', () => {
    const force = createForce();
    const start = force.cars.map((c) => ({ x: c.x, z: c.z }));
    const feet = force.officers.map((o) => ({ x: o.x, z: o.z }));
    const log = runForce(force, { x: 0, y: 0, z: 20.5, dead: false, speed: 0, onFoot: true, vehicleSpeed: 0 }, 30);
    assert.equal(log.shots + log.arrests, 0);
    assert.equal(force.level, 0);
    assert.equal(force.cars.length, 5);
    assert.ok(force.cars.every((c, n) => Math.hypot(c.x - start[n].x, c.z - start[n].z) > 20), 'patrol cars moved');
    assert.ok(force.officers.every((o, n) => Math.hypot(o.x - feet[n].x, o.z - feet[n].z) > 10), 'beat officers walked');
    assert.ok(force.cars.some((c) => Math.hypot(start[force.cars.indexOf(c)].x, start[force.cars.indexOf(c)].z - 20.5) < 40), 'a patrol car starts near the spawn point');
});

test('the admin code is checked against a digest', async () => {
    assert.equal(await checkAdminCode('wrong'), false);
    assert.equal(await checkAdminCode(''), false);
    assert.equal(await checkAdminCode(undefined), false);
    if (process.env.ADMIN_CODE) assert.equal(await checkAdminCode(` ${process.env.ADMIN_CODE} `), true);
});

test('citizens talk about what is happening around them', () => {
    const seen = new Set();
    for (let n = 0; n < 300; n++) seen.add(ambientLine({ wanted: true, rain: true, night: true }));
    assert.ok([...seen].some((l) => l.includes('המשטרה')), 'mentions the police');
    assert.ok([...seen].some((l) => l.includes('הגשם')), 'mentions the rain');
    assert.ok([...seen].some((l) => l.includes('בלילה')), 'mentions the night');
    assert.ok(panicLine().length > 2);
});

test('the cable car loops the whole city and stops on every roof', () => {
    const stops = cableStops(world);
    assert.equal(stops.length, world.buildings.length, 'one stop per building');
    assert.equal(new Set(stops.map((st) => st.id)).size, stops.length, 'each roof once');
    for (let n = 1; n < stops.length; n++) assert.ok(stops[n].angle >= stops[n - 1].angle, 'ordered round the city');
    const segs = cableSegments(stops);
    assert.equal(segs.length, stops.length);
    assert.equal(segs[segs.length - 1].b, stops[0], 'the loop closes');
    for (const st of stops) {
        const b = world.buildings[st.id];
        assert.ok(Math.abs(st.roof - (b.h + 0.2)) < 1e-9, 'stands on the roof');
        assert.ok(st.y > st.roof, 'the cable runs above the roof');
    }
    const at = cablePose(segs, 3, 0);
    assert.equal(at.x, segs[3].a.x);
    assert.equal(at.y, segs[3].a.y);
    const mid = cablePose(segs, 3, 0.5);
    assert.ok(Math.abs(mid.y - CABLE_HEIGHT) < 1e-6, 'the cabin rises above the city between stops');
    assert.equal(cableSamples(segs).length, segs.length * 8 * 3);
});

test('the shop sells weapons, ammo, cars and looks for in-game cash', () => {
    const poor = { ...initialProgress(), cash: 1000 };
    assert.equal(buyItem(poor, 'weapon', 'rifle').ok, false, 'not enough cash');
    const rich = { ...initialProgress(), cash: 10000 };
    const smg = buyItem(rich, 'weapon', 'smg');
    assert.ok(smg.ok && smg.state.cash === 7500 && smg.state.weapons.includes('smg'), 'bought a submachine gun');
    assert.equal(buyItem(smg.state, 'weapon', 'smg').ok, false, 'already owned');
    assert.equal(buyItem(rich, 'ammo', 'smg').ok, false, 'ammo needs the gun first');
    const ammo = buyItem(smg.state, 'ammo', 'smg');
    assert.ok(ammo.ok && ammo.state.cash === 6900, 'a full magazine costs 600');
    const car = buyItem({ ...rich, cash: 30000 }, 'car', 'sport');
    assert.ok(car.ok && car.state.cars.includes('sport') && car.state.cash === 0, 'bought a sport car');
    const look = buyItem(rich, 'costume', 'suit');
    assert.ok(look.ok && look.state.costume === 'suit' && look.state.costumes.includes('suit'), 'bought a suit and put it on');
    const back = buyItem(look.state, 'costume', 'default');
    assert.ok(back.ok && back.state.costume === 'default' && back.state.cash === look.state.cash, 'putting on an owned look is free');
    const free = buyItem(poor, 'car', 'super', true);
    assert.ok(free.ok && free.state.cash === 1000 && free.state.cars.includes('super'), 'the admin pays nothing');
    const list = shopList(rich);
    assert.equal(list.find((i) => i.kind === 'weapon' && i.id === 'rifle').canBuy, false, 'too expensive');
    assert.equal(list.find((i) => i.kind === 'ammo' && i.id === 'smg').canBuy, false, 'no gun, no ammo');
    assert.equal(list.find((i) => i.kind === 'weapon' && i.id === 'smg').canBuy, true, 'affordable');
});
