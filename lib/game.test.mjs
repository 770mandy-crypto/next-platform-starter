// Checks for "Neon City": the shop rules and the game simulation.
import assert from 'node:assert/strict';
import test from 'node:test';
import { addCoins, buy, CARS, CATEGORIES, equip, loadout, newSave, normalizeSave, recordScore, STARTING_COINS, WEAPONS } from './game/catalog.js';
import { BLOCK, buildings, CABLE, hitsBuilding, newGame, RING, step, WORLD } from './game/engine.js';

const idle = { throttle: 0, turn: 0, steerAngle: 0, steerPower: 0, aimAngle: null, firing: false };

test('a new player starts with the free kit and some coins', () => {
    const save = newSave();
    assert.equal(save.coins, STARTING_COINS);
    assert.deepEqual(save.equipped, { weapon: 'laser', car: 'beetle', character: 'rookie' });
    // Every category has exactly one free starter item.
    for (const c of CATEGORIES) assert.equal(c.items.filter((i) => i.price === 0).length, 1, c.id);
});

test('buying costs coins, equips the item, and cannot be done twice or on credit', () => {
    let save = addCoins(newSave(), 500); // 600
    const bought = buy(save, 'weapons', 'plasma');
    assert.equal(bought.ok, true);
    save = bought.save;
    assert.equal(save.coins, 300);
    assert.equal(save.equipped.weapon, 'plasma');
    assert.deepEqual(save.owned.weapons, ['laser', 'plasma']);

    assert.equal(buy(save, 'weapons', 'plasma').ok, false, 'already owned');
    const tooExpensive = buy(save, 'cars', 'hyper');
    assert.equal(tooExpensive.ok, false);
    assert.match(tooExpensive.reason, /חסרים 2200/);
    assert.equal(tooExpensive.save, save, 'a failed purchase changes nothing');
    assert.equal(buy(save, 'cars', 'spaceship').ok, false);
});

test('only owned items can be equipped, and switching back is free', () => {
    let save = buy(addCoins(newSave(), 400), 'cars', 'sport').save;
    assert.equal(equip(save, 'cars', 'jeep').ok, false);
    save = equip(save, 'cars', 'beetle').save;
    assert.equal(save.equipped.car, 'beetle');
    assert.equal(save.coins, 100);
});

test('a save read from storage is cleaned up rather than trusted', () => {
    assert.deepEqual(normalizeSave(null), newSave());
    const tampered = normalizeSave({
        coins: -50,
        owned: { weapons: ['rocket', 'nonsense'], cars: 'hyper' },
        equipped: { weapon: 'rocket', car: 'hyper', character: 'sniper' },
        best: 120.7
    });
    assert.equal(tampered.coins, STARTING_COINS);
    assert.deepEqual(tampered.owned.weapons, ['laser', 'rocket']);
    assert.deepEqual(tampered.owned.cars, ['beetle'], 'a non-list is ignored');
    assert.equal(tampered.equipped.car, 'beetle', 'an item not owned cannot stay equipped');
    assert.equal(tampered.equipped.character, 'rookie');
    assert.equal(tampered.best, 120);
    assert.equal(recordScore(tampered, 50).best, 120);
    assert.equal(recordScore(tampered, 300).best, 300);
});

test('the loadout combines weapon, car and character perks', () => {
    let save = addCoins(newSave(), 5000);
    save = buy(save, 'weapons', 'rocket').save;
    save = buy(save, 'characters', 'sniper').save;
    const kit = loadout(save);
    assert.equal(kit.weapon.id, 'rocket');
    assert.equal(kit.damage, 6 * 1.35);
    assert.equal(loadout(buy(save, 'characters', 'trader').save).coinBonus, 1.5);
    // Better items cost more.
    for (const list of [WEAPONS, CARS]) {
        const prices = list.map((i) => i.price);
        assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
    }
});

// --- The simulation

test('the car drives along the road and cannot drive through buildings', () => {
    const game = newGame(loadout(newSave()), 7);
    const start = { ...game.car };
    // Facing up along a road: driving forward moves it.
    for (let i = 0; i < 30; i += 1) step(game, { ...idle, throttle: 1 }, 1 / 30);
    assert.ok(game.car.y < start.y - 50, 'moved forward');
    assert.ok(Math.abs(game.car.x - start.x) < 1, 'stayed in its lane');

    // Turn into a building and hold the throttle: it never ends up inside one.
    for (let i = 0; i < 300; i += 1) {
        step(game, { ...idle, throttle: 1, turn: i < 20 ? 1 : 0 }, 1 / 30);
        assert.equal(hitsBuilding(game, game.car.x, game.car.y, 21), false, `inside a building at step ${i}`);
    }
});

test('the city layout keeps roads clear on every grid line', () => {
    const list = buildings();
    assert.equal(list.length, 64);
    for (let k = 0; k <= 8; k += 1) {
        for (let t = 50; t < WORLD - 50; t += 37) {
            const game = { buildings: list };
            // The outer roads run along the world's edge, so test just inside it.
            const x = Math.min(WORLD - 40, Math.max(40, k * BLOCK));
            assert.equal(hitsBuilding(game, x, t, 20), false, `road x=${x}, y=${t}`);
            assert.equal(hitsBuilding(game, t, x, 20), false, `road x=${t}, y=${x}`);
        }
    }
});

test('shooting destroys a drone, which drops coins; picking them up applies the coin bonus', () => {
    let save = addCoins(newSave(), 1000);
    save = buy(save, 'characters', 'trader').save;
    const game = newGame(loadout(save), 3);
    game.coins = [];
    game.spawnTimer = 999;
    game.drones = [{ id: 1, x: game.car.x, y: game.car.y - 200, health: 3, maxHealth: 3, speed: 0, spin: 0 }];

    let kills = 0;
    for (let i = 0; i < 120 && !kills; i += 1) kills += step(game, { ...idle, firing: true }, 1 / 30).kills;
    assert.equal(kills, 1, 'auto-aim found the drone and the shots killed it');
    assert.ok(game.coins.length >= 2, 'coins dropped');

    // Drive over the drop.
    const dropped = game.coins.length;
    let collected = 0;
    for (let i = 0; i < 60; i += 1) collected += step(game, { ...idle, throttle: 1 }, 1 / 30).coins;
    assert.ok(collected > 0);
    assert.equal(collected % 1.5, 0, 'each coin is worth 1.5 with the trader');
    assert.ok(game.coins.length < dropped + 5);
});

test('rockets damage drones near the impact too', () => {
    let save = addCoins(newSave(), 3000);
    save = buy(save, 'weapons', 'rocket').save;
    const game = newGame(loadout(save), 5);
    game.spawnTimer = 999;
    const y = game.car.y - 250;
    game.drones = [
        { id: 1, x: game.car.x, y, health: 50, maxHealth: 50, speed: 0, spin: 0 },
        { id: 2, x: game.car.x + 40, y: y - 20, health: 50, maxHealth: 50, speed: 0, spin: 0 }
    ];
    for (let i = 0; i < 30; i += 1) step(game, { ...idle, firing: true, aimAngle: -Math.PI / 2 }, 1 / 30);
    assert.ok(game.drones[1].health < 50, 'the neighbour took splash damage');
});

test('drones that reach the car wear it down until the game is over', () => {
    const game = newGame(loadout(newSave()), 9);
    game.spawnTimer = 999;
    game.drones = [{ id: 1, x: game.car.x, y: game.car.y, health: 999, maxHealth: 999, speed: 0, spin: 0 }];
    let hit = false;
    for (let i = 0; i < 60 * 30 && !game.over; i += 1) hit = step(game, idle, 1 / 30).hit || hit;
    assert.ok(hit);
    assert.equal(game.over, true);
    assert.equal(game.car.health, 0);
    assert.deepEqual(step(game, idle, 1 / 30), { coins: 0, kills: 0, hit: false, shot: false, ride: null, roof: null }, 'nothing moves after the end');
});

test('the mechanic repairs the car over time; armour is the car’s health', () => {
    let save = addCoins(newSave(), 2000);
    save = buy(save, 'cars', 'jeep').save;
    save = buy(save, 'characters', 'mechanic').save;
    const game = newGame(loadout(save), 11);
    assert.equal(game.car.maxHealth, 190);
    game.spawnTimer = 999;
    game.car.health = 100;
    for (let i = 0; i < 30; i += 1) step(game, idle, 1 / 30);
    assert.ok(game.car.health > 103 && game.car.health < 105);
});

test('the same seed plays out the same way', () => {
    const run = () => {
        const game = newGame(loadout(newSave()), 42);
        for (let i = 0; i < 600; i += 1) step(game, { ...idle, throttle: 1, turn: i % 90 < 30 ? 1 : 0, firing: true }, 1 / 30);
        return [Math.round(game.car.x), Math.round(game.car.y), game.drones.length, game.coins.length, Math.round(game.score)];
    };
    assert.deepEqual(run(), run());
});

// --- Cable car

function atStation(game, index) {
    const st = CABLE.stations[index];
    game.car.x = st.x;
    game.car.y = st.y + 30;
    game.car.speed = 0;
    game.spawnTimer = 999;
}

test('stopping at a station rides the cable car to the other side of the city', () => {
    const game = newGame(loadout(newSave()), 21);
    atStation(game, 0);
    const events = step(game, idle, 1 / 30);
    assert.equal(events.ride, 'start');
    assert.ok(game.ride);

    // Half way: somewhere over the city, between the stations.
    for (let i = 0; i < (CABLE.duration / 2) * 30; i += 1) step(game, { ...idle, throttle: 1, turn: 1 }, 1 / 30);
    const [a, b] = CABLE.stations;
    assert.ok(game.car.x > a.x + 200 && game.car.x < b.x - 200, 'mid-ride, the gondola is between the stations');
    assert.equal(game.car.speed, 0, 'driving input is ignored in the gondola');

    let ended = false;
    for (let i = 0; i < CABLE.duration * 30 && !ended; i += 1) ended = step(game, idle, 1 / 30).ride === 'end';
    assert.ok(ended);
    assert.equal(game.ride, null);
    assert.deepEqual([game.car.x, game.car.y], [b.x, b.y]);

    // Standing at the arrival station does not send you straight back.
    for (let i = 0; i < 30; i += 1) assert.equal(step(game, idle, 1 / 30).ride, null);
    // Drive away and come back: now it boards again.
    game.car.x = b.x;
    game.car.y = b.y - 300;
    step(game, idle, 1 / 30);
    atStation(game, 1);
    assert.equal(step(game, idle, 1 / 30).ride, 'start');
});

test('a car going fast through a station does not board', () => {
    const game = newGame(loadout(newSave()), 22);
    atStation(game, 0);
    game.car.speed = 200;
    assert.equal(step(game, { ...idle, throttle: 1 }, 1 / 30).ride, null);
});

test('drones cannot hurt the car in the gondola, and it can still shoot', () => {
    const game = newGame(loadout(newSave()), 23);
    atStation(game, 0);
    step(game, idle, 1 / 30);
    const health = game.car.health;
    let shots = 0;
    for (let i = 0; i < 90; i += 1) {
        game.drones = [{ id: 1, x: game.car.x, y: game.car.y, health: 999, maxHealth: 999, speed: 0, spin: 0 }];
        if (step(game, { ...idle, firing: true }, 1 / 30).shot) shots += 1;
    }
    assert.equal(game.car.health, health);
    assert.ok(shots > 0);
});

test('both stations stand on roads the car can reach', () => {
    const game = newGame(loadout(newSave()), 24);
    for (const st of CABLE.stations) assert.equal(hitsBuilding(game, st.x, st.y, 22), false, st.id);
});

// --- The ring line

function atRingStation(game, index = 0) {
    const st = RING.stations[index];
    game.car.x = st.x;
    game.car.y = st.y + 30;
    game.car.speed = 0;
    game.spawnTimer = 999;
}

test('the ring line circles the city, stopping on every edge roof and collecting its coins', () => {
    assert.equal(RING.roofs.length, 28, 'every building on the edge of the 8x8 city');
    assert.equal(new Set(RING.roofs.map((r) => r.id)).size, 28);
    for (const roof of RING.roofs) {
        // Each roof is on a building, not over a road.
        assert.equal(hitsBuilding({ buildings: buildings() }, roof.x, roof.y, 1), true, roof.id);
    }

    const game = newGame(loadout(newSave()), 31);
    atRingStation(game, 0);
    assert.equal(step(game, idle, 1 / 30).ride, 'start');
    assert.equal(game.ride.line, 'ring');

    const visited = [];
    let coins = 0;
    let ended = false;
    for (let i = 0; i < 120 * 30 && !ended; i += 1) {
        const events = step(game, idle, 1 / 30);
        if (events.roof) visited.push(events.roof);
        coins += events.coins;
        ended = events.ride === 'end';
    }
    assert.ok(ended, 'the loop finishes');
    // All 28 roofs, plus the entry roof again on the way back.
    assert.equal(new Set(visited).size, 28);
    assert.equal(visited.length, 29);
    assert.equal(coins, 28 * RING.roofCoins, 'each roof paid once; the second stop on the entry roof finds it empty');
    const st = RING.stations[0];
    assert.deepEqual([game.car.x, game.car.y], [st.x, st.y], 'back at the station it started from');
    assert.equal(game.car.health, game.car.maxHealth);
});

test('getting off the ring line early lands the car on a street', () => {
    const game = newGame(loadout(newSave()), 32);
    atRingStation(game, 1);
    step(game, idle, 1 / 30);
    for (let i = 0; i < 10 * 30; i += 1) step(game, idle, 1 / 30);
    assert.ok(game.ride, 'still riding');
    const events = step(game, { ...idle, exitRide: true }, 1 / 30);
    assert.equal(events.ride, 'end');
    assert.equal(game.ride, null);
    assert.equal(hitsBuilding(game, game.car.x, game.car.y, 22), false, `landed at ${game.car.x},${game.car.y}`);
    // And can drive away.
    const before = { x: game.car.x, y: game.car.y };
    for (let i = 0; i < 20; i += 1) step(game, { ...idle, throttle: 1 }, 1 / 30);
    assert.notDeepEqual({ x: game.car.x, y: game.car.y }, before);
});

test('the cross line cannot be left mid-air', () => {
    const game = newGame(loadout(newSave()), 33);
    const st = CABLE.stations[0];
    game.car.x = st.x;
    game.car.y = st.y;
    game.spawnTimer = 999;
    step(game, idle, 1 / 30);
    for (let i = 0; i < 60; i += 1) step(game, idle, 1 / 30);
    assert.equal(step(game, { ...idle, exitRide: true }, 1 / 30).ride, null);
    assert.ok(game.ride, 'still on the cross line');
});

test('emptied roofs fill up again after a while', () => {
    const game = newGame(loadout(newSave()), 34);
    game.spawnTimer = 999;
    const roof = RING.roofs[5].id;
    game.roofCoins[roof] = { count: 0, emptiedAt: game.time };
    for (let i = 0; i < (RING.refill - 1) * 30; i += 1) step(game, idle, 1 / 30);
    assert.equal(game.roofCoins[roof].count, 0);
    for (let i = 0; i < 2 * 30; i += 1) step(game, idle, 1 / 30);
    assert.equal(game.roofCoins[roof].count, RING.roofCoins);
});

test('ring and cross stations are all on roads and apart from each other', () => {
    const game = newGame(loadout(newSave()), 35);
    const all = [...CABLE.stations, ...RING.stations];
    for (const st of all) assert.equal(hitsBuilding(game, st.x, st.y, 22), false, st.id);
    for (const a of all) for (const b of all) if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > CABLE.radius * 3);
});
