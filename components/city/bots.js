// Opponents. Every bot runs the same loop the player does (same walls, same
// floors, same weapons), plus a brain: find a route through the streets, use
// doors and elevators to reach any floor, fight in bursts while strafing, fall
// back when hurt and come back when healed. No rendering here.
import { HALF, LINES, levelY, locationOf, stepActor } from './world.js';
import { WEAPONS, WEAPON_ORDER, lineClear, shoot } from './combat.js';

const NAMES = ['רעם', 'צל', 'נץ', 'ברק', 'סופה', 'זאב', 'עיט', 'להב', 'נמר', 'חץ'];
const EYE = 1.5;

const nearestLine = (v) => {
    let best = 0;
    for (let k = 1; k < LINES.length; k++) if (Math.abs(v - LINES[k]) < Math.abs(v - LINES[best])) best = k;
    return best;
};

function spawnPoint(rand, avoid) {
    for (let tries = 0; tries < 40; tries++) {
        const x = LINES[Math.floor(rand() * LINES.length)];
        const z = LINES[Math.floor(rand() * LINES.length)];
        if (!avoid || Math.hypot(x - avoid.x, z - avoid.z) > 70) return { x, z };
    }
    return { x: LINES[0], z: LINES[0] };
}

export function botLoadout(index, stage) {
    const tier = Math.min(WEAPON_ORDER.length - 1, Math.floor((stage + (index % 4)) / 2));
    return {
        weapon: WEAPON_ORDER[tier],
        // Aim error in radians: later stages field steadier shooters.
        skill: Math.max(0.012, 0.045 - stage * 0.004 - (index % 3) * 0.004),
        reaction: Math.max(0.22, 0.55 - stage * 0.035)
    };
}

export function createBot(index, rand, stage = 0, avoid = null) {
    const p = spawnPoint(rand, avoid);
    const load = botLoadout(index, stage);
    return {
        id: index, name: NAMES[index % NAMES.length], x: p.x, y: 0, z: p.z, vy: 0, grounded: true,
        heading: 0, hp: 100, dead: false, respawn: 0, ...load, mag: WEAPONS[load.weapon].mag,
        cooldown: 0, reloading: 0, burst: 0, aim: 0, sees: false, seeT: rand() * 0.2,
        known: null, knownAt: -99, lastHurt: -99, retreat: 0, strafe: rand() < 0.5 ? 1 : -1, strafeT: 0,
        path: null, replan: 0, liftT: 0, stuckT: 0, stuckX: p.x, stuckZ: p.z, jitter: 0, roam: null,
        hunter: index % 4 !== 3, moving: false
    };
}

export function createBots(count, rand, stage = 0, avoid = null) {
    return Array.from({ length: count }, (_, n) => createBot(n, rand, stage, avoid));
}

/** Street route to D: straight if nothing is in the way, otherwise along the road grid. */
export function planRoute(world, bot, D) {
    if (lineClear(world, bot.x, bot.y + 1, bot.z, D.x, bot.y + 1, D.z)) return [D];
    const bi = nearestLine(bot.x), bj = nearestLine(bot.z), di = nearestLine(D.x), dj = nearestLine(D.z);
    const alongNS = Math.abs(bot.x - LINES[bi]) <= Math.abs(bot.z - LINES[bj]);
    const pts = alongNS
        ? [{ x: LINES[bi], z: bot.z }, { x: LINES[bi], z: LINES[dj] }]
        : [{ x: bot.x, z: LINES[bj] }, { x: LINES[di], z: LINES[bj] }];
    pts.push({ x: LINES[di], z: LINES[dj] }, D);
    return pts;
}

/**
 * The point the bot should walk towards right now to get to `goal`, through
 * doors and elevators where needed. Returns null while it waits for a lift.
 */
export function steerPoint(world, bot, goal, dt) {
    const here = locationOf(world, bot.x, bot.y, bot.z);
    const there = locationOf(world, goal.x, goal.y, goal.z);
    if (here.b) {
        const b = here.b;
        const want = there.b === b ? there.level : 0;
        if (here.level !== want) {
            if (Math.hypot(bot.x - b.lift.x, bot.z - b.lift.z) < 0.9) {
                bot.liftT += dt;
                if (bot.liftT > 1.2) {
                    bot.y = levelY(b, want);
                    bot.vy = 0;
                    bot.liftT = 0;
                }
                return null;
            }
            bot.liftT = 0;
            return b.lift;
        }
        if (there.b === b) return goal;
        const aligned = Math.abs(bot.x - b.door.x) < 0.5 && bot.z > b.door.zIn - 0.6;
        return aligned ? { x: b.door.x, z: b.door.zOut + 1 } : { x: b.door.x, z: b.door.zIn };
    }
    let D = goal;
    if (there.b) {
        const b = there.b;
        D = { x: b.door.x, z: b.door.zOut };
        const inDoorway = Math.abs(bot.x - b.door.x) < 0.5 && bot.z < b.door.zOut + 0.4 && bot.z > b.z1 - 0.3;
        if (inDoorway || Math.hypot(bot.x - D.x, bot.z - D.z) < 1) return { x: b.door.x, z: b.door.zIn - 0.8 };
    }
    bot.replan -= dt;
    const last = bot.path?.[bot.path.length - 1];
    if (!bot.path || bot.replan <= 0 || !last || Math.hypot(last.x - D.x, last.z - D.z) > 4) {
        bot.path = planRoute(world, bot, D);
        bot.replan = 2.5;
    }
    while (bot.path.length > 1 && Math.hypot(bot.x - bot.path[0].x, bot.z - bot.path[0].z) < 2.2) bot.path.shift();
    return bot.path[0];
}

export function hurtBot(bot, damage, time, from = null) {
    if (bot.dead) return false;
    bot.hp -= damage;
    bot.lastHurt = time;
    if (from) {
        bot.known = { x: from.x, y: from.y, z: from.z };
        bot.knownAt = time;
    }
    if (bot.hp <= 0) {
        bot.hp = 0;
        bot.dead = true;
        bot.respawn = 7;
        return true;
    }
    if (bot.hp < 32 && bot.retreat <= 0) bot.retreat = 3.5;
    return false;
}

/**
 * Advance one bot. ctx: { world, target: {x, y, z, dead, speed}, time, rand,
 * stage, noise: {x, y, z, time} | null, onShot(bot, origin, pellets) }.
 */
export function updateBot(bot, dt, ctx) {
    const { world, target, time, rand } = ctx;
    if (bot.dead) {
        bot.respawn -= dt;
        if (bot.respawn <= 0) Object.assign(bot, createBot(bot.id, rand, ctx.stage || 0, target), { name: bot.name });
        return;
    }
    const w = WEAPONS[bot.weapon];
    bot.cooldown -= dt;
    if (bot.reloading > 0 && (bot.reloading -= dt) <= 0) bot.mag = w.mag;
    if (time - bot.lastHurt > 4 && bot.hp < 100) bot.hp = Math.min(100, bot.hp + 9 * dt);
    if (bot.retreat > 0) bot.retreat -= dt;

    const dx = target.x - bot.x, dy = target.y - bot.y, dz = target.z - bot.z;
    const dist = Math.hypot(dx, dy, dz);
    bot.seeT -= dt;
    if (bot.seeT <= 0) {
        bot.seeT = 0.2;
        bot.sees = !target.dead && dist < Math.max(w.range, 60) && lineClear(world, bot.x, bot.y + EYE, bot.z, target.x, target.y + 1, target.z);
    }
    if (bot.sees) {
        bot.known = { x: target.x, y: target.y, z: target.z };
        bot.knownAt = time;
        bot.aim += dt;
    } else bot.aim = 0;
    if (ctx.noise && time - ctx.noise.time < 0.3 && Math.hypot(ctx.noise.x - bot.x, ctx.noise.z - bot.z) < 90) {
        bot.known = { x: ctx.noise.x, y: ctx.noise.y, z: ctx.noise.z };
        bot.knownAt = time;
    }
    // Hunters are never lost for long: they pick the trail up again.
    if (bot.hunter && !target.dead && time - bot.knownAt > 6) {
        bot.known = { x: target.x, y: target.y, z: target.z };
        bot.knownAt = time;
    }

    let mx = 0, mz = 0, speed = 5.6;
    const toward = (p) => {
        if (!p) return;
        const ax = p.x - bot.x, az = p.z - bot.z, len = Math.hypot(ax, az);
        if (len > 0.15) { mx = ax / len; mz = az / len; }
    };
    const flat = Math.hypot(dx, dz) || 1;

    const hostile = ctx.hostile !== false;
    if (!hostile && bot.sees && !target.dead) {
        // Not allowed to open fire (police at a low wanted level): close in to make an arrest.
        if (dist > 1.1) toward(steerPoint(world, bot, target, dt));
        speed = 7.2;
    } else if (bot.retreat > 0 && !target.dead) {
        // Break contact: back away, around the nearest corner if there is one.
        const away = { x: bot.x - (dx / flat) * 30, y: bot.y, z: bot.z - (dz / flat) * 30 };
        toward(locationOf(world, bot.x, bot.y, bot.z).b ? { x: bot.x - dx / flat, z: bot.z - dz / flat } : steerPoint(world, bot, away, dt));
        speed = 7.8;
    } else if (bot.sees) {
        const prefer = Math.min(w.range * 0.45, 26);
        bot.strafeT -= dt;
        if (bot.strafeT <= 0) { bot.strafeT = 0.7 + rand() * 0.9; bot.strafe = rand() < 0.5 ? 1 : -1; }
        if (dist > prefer) { toward(steerPoint(world, bot, target, dt)); speed = 6.4; }
        else if (dist < 6) { mx = -dx / flat; mz = -dz / flat; }
        if (dist <= prefer * 1.3) { mx += (-dz / flat) * bot.strafe * 0.9; mz += (dx / flat) * bot.strafe * 0.9; }
        const len = Math.hypot(mx, mz);
        if (len > 1) { mx /= len; mz /= len; }

        if (bot.aim > bot.reaction && bot.cooldown <= 0 && bot.reloading <= 0) {
            if (bot.mag <= 0) bot.reloading = w.reload;
            else {
                const error = bot.skill * (1 + dist / 70) + Math.min(0.03, (target.speed || 0) * 0.0022);
                const origin = [bot.x, bot.y + EYE, bot.z];
                const ty = target.y + 1 - origin[1];
                const len3 = Math.hypot(dx, ty, dz) || 1;
                const pellets = shoot(world, origin, [dx / len3, ty / len3, dz / len3], w, [target], rand, w.spread + error);
                bot.mag--;
                bot.cooldown = 1 / w.rate;
                if (w.auto && ++bot.burst >= 5) { bot.burst = 0; bot.cooldown = 0.35 + rand() * 0.4; }
                ctx.onShot?.(bot, origin, pellets);
            }
        }
    } else if (bot.known && time - bot.knownAt < 15 && !target.dead) {
        if (Math.hypot(bot.known.x - bot.x, bot.known.z - bot.z) < 1.5 && Math.abs(bot.known.y - bot.y) < 2) bot.known = null;
        else { toward(steerPoint(world, bot, bot.known, dt)); speed = 7.6; }
    } else {
        if (!bot.roam || Math.hypot(bot.roam.x - bot.x, bot.roam.z - bot.z) < 3) {
            bot.roam = { x: LINES[Math.floor(rand() * LINES.length)], y: 0, z: LINES[Math.floor(rand() * LINES.length)] };
        }
        toward(steerPoint(world, bot, bot.roam, dt));
        speed = 3.4;
    }

    // Unstick: if it meant to move and did not, sidestep and plan again.
    if (bot.jitter > 0) { bot.jitter -= dt; const t = mx; mx = -mz; mz = t; }
    bot.moving = Math.hypot(mx, mz) > 0.05;
    stepActor(world, bot, mx, mz, speed, dt);
    bot.x = Math.max(-HALF - 20, Math.min(HALF + 20, bot.x));
    bot.stuckT += dt;
    if (bot.stuckT > 1.2) {
        if (bot.moving && Math.hypot(bot.x - bot.stuckX, bot.z - bot.stuckZ) < 0.5) { bot.path = null; bot.jitter = 0.5; bot.roam = null; }
        bot.stuckT = 0; bot.stuckX = bot.x; bot.stuckZ = bot.z;
    }
    if (bot.sees) bot.heading = Math.atan2(dx, dz);
    else if (bot.moving) bot.heading = Math.atan2(mx, mz);
}
