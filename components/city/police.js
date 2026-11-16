// The police: a wanted level from 0 to 5 stars, patrol cars, chase cars that
// drive the street grid to the player, officers who get out and either make an
// arrest (low levels) or open fire (high levels, or once you shoot at them),
// and escaping by staying out of sight long enough. Pure logic, no rendering.
import { LINES, SEA_Z, HALF, resolveSolids } from './world.js';
import { WEAPONS, WEAPON_ORDER, lineClear } from './combat.js';
import { createBot, hurtBot, planRoute, updateBot } from './bots.js';

export const MAX_WANTED = 5;
const OFFICERS_FOR = [0, 2, 4, 6, 8, 10];
const CHASE_CARS_FOR = [0, 1, 2, 3, 3, 4];
const OFFICER_WEAPON = ['pistol', 'pistol', 'pistol', 'smg', 'rifle', 'rifle'];
const PATROL_SPOTS = [[4, 4], [2, 5], [6, 1], [1, 2], [5, 6]];
const BEAT_SPOTS = [[3, 4], [4, 3], [2, 3], [5, 4]];
const RESPONDERS = [0, 1, 2, 3, 4, 5];

/** Seconds out of every officer's sight that it takes to lose the police. */
export const escapeTime = (level) => 8 + level * 4;

const wrap = (a) => {
    a %= Math.PI * 2;
    if (a > Math.PI) a -= Math.PI * 2;
    if (a < -Math.PI) a += Math.PI * 2;
    return a;
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function newCar(force, x, z, yaw, patrol) {
    return {
        id: force.nextId++, x, y: 0, z, yaw, speed: 0, crew: 2, patrol, parked: false,
        goal: null, path: null, replan: 0, stuckT: 0, stuckX: x, stuckZ: z, reverseT: 0, emptyT: 0
    };
}

export function createForce(patrols = PATROL_SPOTS.length, rand = Math.random) {
    const force = { level: 0, unseen: 0, seen: false, seeT: 0, aggressive: false, cars: [], officers: [], spawnT: 0, nextId: 1, arrestT: 0, ramT: 0, patrols, beats: patrols > 0 ? BEAT_SPOTS.length : 0 };
    for (const [i, j] of PATROL_SPOTS.slice(0, patrols)) force.cars.push(newCar(force, LINES[i], LINES[j], 0, true));
    // Officers on the beat walk the streets all the time, so the police are always around.
    for (const [i, j] of BEAT_SPOTS.slice(0, force.beats)) force.officers.push(Object.assign(createOfficer(force, LINES[i] + 3, LINES[j] + 3, 0, rand), { beat: true }));
    return force;
}

export function raiseWanted(force, level, aggressive = false) {
    if (aggressive) force.aggressive = true;
    const next = clamp(Math.round(level), 0, MAX_WANTED);
    if (next > force.level) {
        force.level = next;
        force.unseen = 0;
        force.spawnT = Math.min(force.spawnT, 0.5);
    }
}

export function clearWanted(force) {
    force.level = 0;
    force.unseen = 0;
    force.aggressive = false;
    force.arrestT = 0;
}

/** Police shoot at three stars and above, or as soon as someone shoots at them. */
export const hostile = (force) => force.level >= 3 || force.aggressive;

/** Damage an officer; shooting at the police always makes things worse. */
export function hitOfficer(force, officer, damage, time, from) {
    const killed = hurtBot(officer, damage, time, from);
    if (killed) officer.removeT = 5;
    raiseWanted(force, Math.max(2, force.level + (killed ? 1 : 0)), true);
    return killed;
}

/** Gunfire heard by a nearby officer or patrol car earns a star. */
export function reportGunfire(force, x, z) {
    const near = force.officers.some((o) => !o.dead && Math.hypot(o.x - x, o.z - z) < 45)
        || force.cars.some((c) => c.crew > 0 && Math.hypot(c.x - x, c.z - z) < 45);
    if (near) raiseWanted(force, Math.max(1, force.level));
    return near;
}

function createOfficer(force, x, z, level, rand) {
    const o = createBot(force.nextId++, rand, 0);
    const weapon = OFFICER_WEAPON[level];
    return Object.assign(o, {
        name: 'שוטר', police: true, hunter: true, x, y: 0, z, vy: 0, weapon, mag: WEAPONS[weapon].mag,
        skill: 0.028, reaction: 0.45, removeT: null, leaveT: null
    });
}

function dismount(force, car, level, rand) {
    for (let n = 0; n < car.crew; n++) {
        const side = n % 2 ? 1 : -1;
        const out = { x: car.x + Math.cos(car.yaw) * 1.8 * side, z: car.z - Math.sin(car.yaw) * 1.8 * side };
        force.officers.push(createOfficer(force, out.x, out.z, level, rand));
    }
    car.crew = 0;
    car.parked = true;
    car.speed = 0;
}

/** Drive a car along the street grid towards goal. */
export function driveCar(world, car, goal, dt, max) {
    car.replan -= dt;
    const last = car.path?.[car.path.length - 1];
    if (!car.path || car.replan <= 0 || !last || dist2(last, goal) > 6) {
        car.path = planRoute(world, car, goal);
        car.replan = 1.5;
    }
    while (car.path.length > 1 && dist2(car, car.path[0]) < 4) car.path.shift();
    const p = car.path[0];
    const d = dist2(car, p);
    const diff = wrap(Math.atan2(p.x - car.x, p.z - car.z) - car.yaw);
    let target = max * Math.max(0.25, Math.cos(diff));
    if (car.path.length === 1) target = Math.min(target, d * 1.1);
    if (car.reverseT > 0) {
        car.reverseT -= dt;
        target = -6;
    }
    const steer = 2.3 * clamp(Math.abs(car.speed) / 6, 0.35, 1) * dt;
    car.yaw = wrap(car.yaw + clamp(diff, -steer, steer) * (car.speed < -0.5 ? -1 : 1));
    car.speed += clamp(target - car.speed, -26 * dt, 15 * dt);
    const out = resolveSolids(world, car.x + Math.sin(car.yaw) * car.speed * dt, car.z + Math.cos(car.yaw) * car.speed * dt, 0, 1.4);
    if (out.hit) car.speed *= 0.4;
    car.x = clamp(out.x, -HALF - 60, HALF + 60);
    car.z = clamp(out.z, -HALF - 60, SEA_Z - 1.5);
    car.stuckT += dt;
    if (car.stuckT > 1.2) {
        if (Math.abs(target) > 2 && Math.hypot(car.x - car.stuckX, car.z - car.stuckZ) < 0.8 && car.reverseT <= 0) {
            car.reverseT = 1.1;
            car.path = null;
        }
        car.stuckT = 0; car.stuckX = car.x; car.stuckZ = car.z;
    }
}

function spawnPoint(world, player, rand) {
    const options = [];
    for (const x of LINES) for (const z of LINES) {
        const d = Math.hypot(x - player.x, z - player.z);
        if (d > 55 && d < 125) options.push({ x, z, hidden: !lineClear(world, x, 1.2, z, player.x, player.y + 1, player.z) });
    }
    const hidden = options.filter((o) => o.hidden);
    const pool = hidden.length ? hidden : options;
    if (pool.length) return pool[Math.floor(rand() * pool.length)];
    // Far outside the grid (out at sea): come from the nearest corner of it.
    let best = { x: LINES[0], z: LINES[0] }, bd = Infinity;
    for (const x of LINES) for (const z of LINES) {
        const d = Math.hypot(x - player.x, z - player.z);
        if (d < bd) { bd = d; best = { x, z }; }
    }
    return best;
}

/**
 * Advance the police. ctx: { world, player: {x, y, z, dead, speed, onFoot,
 * vehicleSpeed}, time, rand, onShot(officer, origin, pellets), onArrest(),
 * onRam(damage), onEscape(level) }.
 */
export function updateForce(force, dt, ctx) {
    const { world, player, time, rand } = ctx;
    const chasing = force.level > 0 && !player.dead;
    force.ramT -= dt;

    // Reinforcements.
    if (chasing) {
        force.spawnT -= dt;
        const crewedChase = force.cars.filter((c) => c.crew > 0 && !c.patrol).length;
        const crewed = force.cars.filter((c) => c.crew > 0).length;
        const people = force.officers.filter((o) => !o.dead).length + Math.min(crewed, RESPONDERS[force.level]) * 2;
        if (force.spawnT <= 0 && people < OFFICERS_FOR[force.level] && crewedChase < CHASE_CARS_FOR[force.level] && force.cars.length < 10) {
            const p = spawnPoint(world, player, rand);
            force.cars.push(newCar(force, p.x, p.z, Math.atan2(player.x - p.x, player.z - p.z), false));
            force.spawnT = 3.5;
        }
    }

    // Cars: chase, patrol, or stand parked.
    const goal = { x: player.x, y: 0, z: Math.min(player.z, SEA_Z - 2) };
    // Only the nearest cars answer the call; the rest keep patrolling.
    const crews = force.cars.filter((c) => c.crew > 0 && !c.parked).sort((a, b) => dist2(a, goal) - dist2(b, goal));
    crews.forEach((c, n) => { c.responding = chasing && n < RESPONDERS[force.level]; });
    for (const car of force.cars) {
        if (car.parked) {
            car.emptyT += dt;
            continue;
        }
        if (car.crew <= 0) continue;
        if (car.responding) {
            const d = dist2(car, goal);
            const canStop = player.onFoot || (player.vehicleSpeed ?? 0) < 5 || player.z > SEA_Z;
            if (d < 15 && canStop) {
                dismount(force, car, force.level, rand);
                continue;
            }
            driveCar(world, car, goal, dt, 27);
            if (!player.onFoot && d < 3.4 && Math.abs(car.speed) > 6 && force.ramT <= 0) {
                ctx.onRam?.(8);
                force.ramT = 1;
                car.speed *= -0.3;
            }
        } else {
            if (!car.goal || dist2(car, car.goal) < 5) {
                car.goal = { x: LINES[1 + Math.floor(rand() * (LINES.length - 2))], y: 0, z: LINES[1 + Math.floor(rand() * (LINES.length - 2))] };
            }
            driveCar(world, car, car.goal, dt, 11);
        }
    }

    // Officers on foot.
    const shoot = hostile(force);
    const want = OFFICER_WEAPON[force.level];
    for (const o of force.officers) {
        if (o.dead) {
            o.removeT -= dt;
            continue;
        }
        if (!chasing) {
            o.sees = false;
            if (o.beat) updateBot(o, dt, { world, target: { x: o.x, y: o.y, z: o.z, dead: true, speed: 0 }, time, rand, stage: 0, hostile: false });
            else o.leaveT = (o.leaveT ?? 6) - dt;
            continue;
        }
        o.leaveT = null;
        if (WEAPON_ORDER.indexOf(want) > WEAPON_ORDER.indexOf(o.weapon)) {
            o.weapon = want;
            o.mag = WEAPONS[want].mag;
        }
        updateBot(o, dt, { world, target: ctx.target || player, time, rand, stage: 0, hostile: shoot, onShot: ctx.onShot });
    }
    force.officers = force.officers.filter((o) => !(o.dead && o.removeT <= 0) && !(o.leaveT !== null && o.leaveT <= 0));

    // Back to normal once the chase is over: patrol cars and beat officers are topped up.
    if (!chasing) {
        force.spawnT -= dt;
        const crewedCars = force.cars.filter((c) => c.crew > 0);
        for (const c of crewedCars) c.patrol = true;
        if (force.spawnT <= 0) {
            const p = spawnPoint(world, player, rand);
            if (crewedCars.length < force.patrols) { force.cars.push(newCar(force, p.x, p.z, 0, true)); force.spawnT = 4; }
            else if (force.officers.filter((o) => o.beat && !o.dead).length < force.beats) {
                force.officers.push(Object.assign(createOfficer(force, p.x + 3, p.z + 3, 0, rand), { beat: true }));
                force.spawnT = 4;
            }
        }
        force.cars = force.cars.filter((c) => c.crew > 0 || (c.parked && c.emptyT < 12));
    }
    force.cars = force.cars.filter((c) => !c.parked || Math.hypot(c.x - player.x, c.z - player.z) < 160);

    if (!chasing) return;

    // Who can see the player right now?
    force.seeT -= dt;
    if (force.seeT <= 0) {
        force.seeT = 0.25;
        force.seen = force.officers.some((o) => !o.dead && o.sees)
            || force.cars.some((c) => c.crew > 0 && dist2(c, player) < 55 && lineClear(world, c.x, 1.3, c.z, player.x, player.y + 1, player.z));
    }
    const onTheCase = force.officers.some((o) => !o.dead) || force.cars.some((c) => c.crew > 0);
    if (force.seen) force.unseen = 0;
    else if (onTheCase) force.unseen += dt;
    if (force.unseen >= escapeTime(force.level)) {
        const level = force.level;
        clearWanted(force);
        ctx.onEscape?.(level);
        return;
    }

    // An officer next to a player who is not running away makes an arrest.
    const close = player.onFoot && force.officers.some((o) => !o.dead && Math.hypot(o.x - player.x, o.z - player.z) < 1.7 && Math.abs(o.y - player.y) < 1.5);
    force.arrestT = close && player.speed < 3 ? force.arrestT + dt : Math.max(0, force.arrestT - dt);
    if (force.arrestT > 1.2) {
        clearWanted(force);
        ctx.onArrest?.();
    }
}
