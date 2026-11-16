// "Neon City" simulation: a top-down city of roads and buildings, the
// player's car, its gun, robot drones that hunt it, and coins. No drawing
// here: step() advances the world by dt seconds from an input, and the page
// draws whatever state results. That keeps the rules testable without a
// browser.

export const BLOCK = 440; // one city block plus its road
export const ROAD = 150; // road width
export const GRID = 8; // blocks per side
export const WORLD = BLOCK * GRID;
const CAR_RADIUS = 22;
const DRONE_RADIUS = 18;
const COIN_RADIUS = 12;
const PICKUP_RANGE = 46;

// The cable car: two stations at road crossings on opposite sides of the
// city, joined by a cable overhead. Stop at a station to ride to the other
// one. Drones cannot reach the gondola, so it is also a way out of trouble.
export const CABLE = {
    stations: [
        { id: 'north', x: BLOCK * 1, y: BLOCK * 1, name: 'תחנת הצפון' },
        { id: 'south', x: BLOCK * 7, y: BLOCK * 7, name: 'תחנת הדרום' }
    ],
    radius: 60, // how close counts as "at the station"
    maxBoardSpeed: 70, // nearly stopped
    duration: 7 // seconds for the ride
};

// Seeded random numbers, so a world can be replayed in tests.
export function rng(seed = 1) {
    let s = seed >>> 0 || 1;
    return () => {
        s ^= s << 13;
        s ^= s >>> 17;
        s ^= s << 5;
        return (s >>> 0) / 4294967296;
    };
}

// Roads run along x = k*BLOCK and y = k*BLOCK (k = 0..GRID); each block's
// building fills the square between roads, with a sidewalk margin.
export function buildings() {
    const list = [];
    const margin = ROAD / 2 + 14;
    for (let i = 0; i < GRID; i += 1) {
        for (let j = 0; j < GRID; j += 1) {
            list.push({
                x: i * BLOCK + margin,
                y: j * BLOCK + margin,
                w: BLOCK - margin * 2,
                h: BLOCK - margin * 2,
                hue: (i * 47 + j * 83) % 360
            });
        }
    }
    return list;
}

// A random point in the middle of some road.
function roadPoint(random) {
    const along = ROAD + random() * (WORLD - ROAD * 2);
    const line = Math.floor(random() * (GRID + 1)) * BLOCK;
    const offset = (random() - 0.5) * (ROAD * 0.6);
    const across = Math.min(WORLD - ROAD / 2, Math.max(ROAD / 2, line + offset));
    return random() < 0.5 ? { x: along, y: across } : { x: across, y: along };
}

export function newGame(kit, seed = Date.now()) {
    const random = rng(seed);
    const state = {
        random,
        time: 0,
        over: false,
        score: 0,
        coinsThisRun: 0,
        wave: 1,
        kit,
        buildings: buildings(),
        car: { x: BLOCK * 4, y: BLOCK * 4, angle: -Math.PI / 2, speed: 0, health: kit.car.health, maxHealth: kit.car.health },
        bullets: [],
        drones: [],
        coins: [],
        effects: [],
        cooldown: 0,
        spawnTimer: 1.5,
        ride: null, // { from, to, t } while in the cable car
        rideLock: null, // the station just arrived at: leave it before boarding again
        nextId: 1
    };
    for (let i = 0; i < 40; i += 1) state.coins.push({ id: state.nextId++, ...roadPoint(random), value: 1 });
    return state;
}

function hitsBuilding(state, x, y, radius) {
    if (x < radius || y < radius || x > WORLD - radius || y > WORLD - radius) return true;
    return state.buildings.some((b) => x > b.x - radius && x < b.x + b.w + radius && y > b.y - radius && y < b.y + b.h + radius);
}

const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

// input: {
//   throttle: -1..1, turn: -1..1           keyboard driving (tank style), or
//   steerAngle, steerPower: 0..1           a joystick: drive toward this angle
//   aimAngle: number | null                aim; null means aim at the nearest drone
//   firing: boolean
// }
// Returns events for the page: { coins, kills, hit, shot }.
export function step(state, input, dt) {
    const events = { coins: 0, kills: 0, hit: false, shot: false, ride: null };
    if (state.over) return events;
    dt = Math.min(dt, 0.05);
    state.time += dt;
    const { car: stats, weapon } = state.kit;
    const car = state.car;

    // --- Cable car: riding replaces driving
    if (state.ride) {
        state.ride.t += dt / CABLE.duration;
        const { from, to } = state.ride;
        const t = Math.min(1, state.ride.t);
        const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        car.x = from.x + (to.x - from.x) * eased;
        car.y = from.y + (to.y - from.y) * eased;
        car.speed = 0;
        if (t >= 1) {
            state.ride = null;
            state.rideLock = to.id;
            events.ride = 'end';
        }
    } else {
        const station = CABLE.stations.find((st) => (st.x - car.x) ** 2 + (st.y - car.y) ** 2 < CABLE.radius ** 2);
        if (!station) state.rideLock = null;
        else if (station.id !== state.rideLock && Math.abs(car.speed) < CABLE.maxBoardSpeed) {
            const to = CABLE.stations.find((st) => st !== station);
            state.ride = { from: { x: station.x, y: station.y }, to, t: 0 };
            car.x = station.x;
            car.y = station.y;
            car.speed = 0;
            events.ride = 'start';
        }
    }
    state.nearStation = !state.ride && CABLE.stations.some((st) => (st.x - car.x) ** 2 + (st.y - car.y) ** 2 < (CABLE.radius * 2.5) ** 2) && state.rideLock === null;

    // --- Driving
    let throttle = state.ride ? 0 : input.throttle ?? 0;
    if (state.ride) {
        // In the gondola: no steering.
    } else if (input.steerPower > 0.15) {
        const diff = angleDiff(car.angle, input.steerAngle);
        car.angle += Math.max(-1, Math.min(1, diff * 3)) * stats.handling * dt;
        throttle = Math.abs(diff) > 2.2 ? -0.5 : input.steerPower;
    } else if (input.turn) {
        const direction = car.speed < -5 ? -1 : 1;
        car.angle += input.turn * stats.handling * dt * direction * Math.min(1, Math.abs(car.speed) / 80 + 0.25);
    }
    if (throttle > 0) car.speed += stats.accel * throttle * dt;
    else if (throttle < 0) car.speed += stats.accel * throttle * dt * (car.speed > 0 ? 2 : 0.6);
    else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 220 * dt);
    car.speed = Math.max(-stats.maxSpeed * 0.4, Math.min(stats.maxSpeed, car.speed));

    if (!state.ride) {
        const nx = car.x + Math.cos(car.angle) * car.speed * dt;
        const ny = car.y + Math.sin(car.angle) * car.speed * dt;
        if (!hitsBuilding(state, nx, car.y, CAR_RADIUS)) car.x = nx;
        else car.speed *= -0.3;
        if (!hitsBuilding(state, car.x, ny, CAR_RADIUS)) car.y = ny;
        else car.speed *= -0.3;
    }

    if (state.kit.regen) car.health = Math.min(car.maxHealth, car.health + state.kit.regen * dt);

    // --- Shooting
    state.cooldown -= dt;
    let aim = input.aimAngle;
    if (aim == null) {
        let nearest = null;
        let best = 650 ** 2;
        for (const d of state.drones) {
            const dist = (d.x - car.x) ** 2 + (d.y - car.y) ** 2;
            if (dist < best) {
                best = dist;
                nearest = d;
            }
        }
        aim = nearest ? Math.atan2(nearest.y - car.y, nearest.x - car.x) : car.angle;
    }
    state.aim = aim;
    if (input.firing && state.cooldown <= 0) {
        state.cooldown = 1 / weapon.rate;
        const a = aim + (state.random() - 0.5) * 2 * weapon.spread;
        state.bullets.push({ x: car.x + Math.cos(a) * 26, y: car.y + Math.sin(a) * 26, vx: Math.cos(a) * weapon.speed, vy: Math.sin(a) * weapon.speed, life: 0.9 });
        events.shot = true;
    }

    // --- Bullets
    for (const b of state.bullets) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (hitsBuilding(state, b.x, b.y, 2)) b.life = 0;
        for (const d of state.drones) {
            if (b.life > 0 && (d.x - b.x) ** 2 + (d.y - b.y) ** 2 < DRONE_RADIUS ** 2) {
                b.life = 0;
                d.health -= state.kit.damage;
                if (weapon.splash) {
                    state.effects.push({ x: b.x, y: b.y, r: weapon.splash, t: 0.35, color: weapon.color });
                    for (const other of state.drones) {
                        if (other !== d && (other.x - b.x) ** 2 + (other.y - b.y) ** 2 < weapon.splash ** 2) other.health -= state.kit.damage * 0.6;
                    }
                }
            }
        }
    }
    state.bullets = state.bullets.filter((b) => b.life > 0);

    // --- Drones: spawn away from the car, chase, hurt on contact
    state.wave = 1 + Math.floor(state.time / 30);
    state.spawnTimer -= dt;
    const cap = 3 + state.wave * 2;
    if (state.spawnTimer <= 0 && state.drones.length < cap) {
        state.spawnTimer = Math.max(0.6, 2.4 - state.wave * 0.2);
        let spot;
        for (let tries = 0; tries < 10; tries += 1) {
            spot = roadPoint(state.random);
            if ((spot.x - car.x) ** 2 + (spot.y - car.y) ** 2 > 500 ** 2) break;
        }
        const health = 2 + state.wave;
        state.drones.push({ id: state.nextId++, x: spot.x, y: spot.y, health, maxHealth: health, speed: 110 + state.wave * 12 + state.random() * 40, spin: 0 });
    }
    for (const d of state.drones) {
        const dx = car.x - d.x;
        const dy = car.y - d.y;
        const dist = Math.hypot(dx, dy) || 1;
        d.x += (dx / dist) * d.speed * dt;
        d.y += (dy / dist) * d.speed * dt;
        d.spin += dt * 12;
        if (dist < CAR_RADIUS + DRONE_RADIUS && !state.ride) {
            car.health -= (14 + state.wave * 2) * dt;
            events.hit = true;
        }
    }
    for (const d of state.drones) {
        if (d.health > 0) continue;
        events.kills += 1;
        state.score += 10 * state.wave;
        state.effects.push({ x: d.x, y: d.y, r: 40, t: 0.4, color: '#f43f5e' });
        const drops = 2 + Math.floor(state.random() * 3);
        for (let i = 0; i < drops; i += 1) {
            state.coins.push({ id: state.nextId++, x: d.x + (state.random() - 0.5) * 50, y: d.y + (state.random() - 0.5) * 50, value: 1 });
        }
    }
    state.drones = state.drones.filter((d) => d.health > 0);

    // --- Coins: picked up when close; the street refills slowly
    for (const c of state.coins) {
        if (!state.ride && (c.x - car.x) ** 2 + (c.y - car.y) ** 2 < PICKUP_RANGE ** 2) {
            c.taken = true;
            const value = Math.round(c.value * state.kit.coinBonus * 10) / 10;
            state.coinsThisRun += value;
            events.coins += value;
        }
    }
    state.coins = state.coins.filter((c) => !c.taken);
    if (state.coins.length < 25 && state.random() < dt * 2) state.coins.push({ id: state.nextId++, ...roadPoint(state.random), value: 1 });

    for (const e of state.effects) e.t -= dt;
    state.effects = state.effects.filter((e) => e.t > 0);

    state.score += dt;
    if (car.health <= 0) {
        car.health = 0;
        state.over = true;
    }
    return events;
}

export { CAR_RADIUS, DRONE_RADIUS, COIN_RADIUS, hitsBuilding };
