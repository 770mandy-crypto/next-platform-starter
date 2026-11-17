// End-to-end tests for /city in a real browser: every button, every route
// through the game (buildings and elevators, weapons, bots, stages, cars,
// boats, helicopter, chat, phones). Needs a running server:
//   npm run dev        (in one terminal)
//   npm run test:e2e   (in another; BASE_URL defaults to http://localhost:3111)
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PAD_H, SEA_Z, generateWorld, levelY } from './world.js';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3111';
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const world = generateWorld(11);
const tower = world.buildings.find((b) => b.floors === 21);
const hill = world.blocks.find((b) => b.type === 'hill');
const padBlock = world.blocks.find((b) => b.type === 'helipad');

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = [];

function assert(cond, message) {
    if (!cond) throw new Error(message);
}
async function until(fn, message, ms = 8000) {
    const end = Date.now() + ms;
    for (;;) {
        const v = await fn();
        if (v) return v;
        if (Date.now() > end) throw new Error(`timed out: ${message}`);
        await new Promise((r) => setTimeout(r, 100));
    }
}

async function test(name, fn, opts = {}) {
    if (ONLY && !ONLY.test(name)) return;
    const started = Date.now();
    const context = await browser.newContext(opts.device ? devices[opts.device] : { viewport: { width: 1100, height: 680 } });
    const page = await context.newPage();
    const problems = [];
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text().slice(0, 200)}`); });
    const t = {
        page,
        snap: () => page.evaluate(() => window.__cityGame.snapshot()),
        adv: (s) => page.evaluate((x) => window.__cityGame.debug.advance(x), s),
        tp: (x, y, z) => page.evaluate(([a, b, c]) => window.__cityGame.debug.teleport(a, b, c), [x, y, z]),
        emit: (e, v) => page.evaluate(([a, b]) => window.__cityGame.debug.emit(a, b), [e, v]),
        vehicles: () => page.evaluate(() => window.__cityGame.debug.vehicles()),
        text: (sel) => page.locator(sel).first().innerText(),
        visible: (sel) => page.locator(sel).first().isVisible(),
        open: async (bots = false, fresh = true) => {
            await page.goto(`${BASE}/city`, { waitUntil: 'networkidle', timeout: 120000 });
            if (fresh) await page.evaluate(() => localStorage.clear());
            await page.waitForSelector('.start-play');
            await page.click('.start-play');
            await page.waitForSelector('.hud-loc');
            if (bots) await page.evaluate(() => window.__cityGame.setBots(true));
            // Logic runs on test time from here on; drawing frames in a software
            // GPU would only slow the run down.
            if (!opts.render) await page.evaluate(() => window.__cityGame.debug.pause(true));
        },
        press: async (key) => { await page.keyboard.press(key); },
        hold: async (key, seconds) => { await page.keyboard.down(key); await t.adv(seconds); await page.keyboard.up(key); }
    };
    try {
        await fn(t);
        assert(problems.length === 0, `browser errors:\n  ${problems.join('\n  ')}`);
        results.push({ name, ok: true, ms: Date.now() - started });
        console.log(`  ok   ${name} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    } catch (err) {
        results.push({ name, ok: false, err });
        console.log(`  FAIL ${name}\n       ${String(err.message).split('\n').join('\n       ')}`);
        await page.screenshot({ path: join(tmpdir(), `city-e2e-fail-${results.length}.png`) }).catch(() => {});
    } finally {
        await context.close();
    }
}

console.log(`city e2e against ${BASE}`);

await test('route /city serves the game and the start screen buttons exist', async (t) => {
    const res = await t.page.goto(`${BASE}/city`, { waitUntil: 'networkidle', timeout: 120000 });
    assert(res.status() === 200, `status ${res.status()}`);
    assert((await t.page.title()).includes('עיר המעלות'), 'title');
    assert(await t.page.locator('html').getAttribute('lang') !== null, 'lang');
    assert(await t.visible('.start-play'), 'play button');
    assert(await t.visible('.start-admin'), 'admin button');
    assert((await t.text('.start-card h1')) === 'עיר המעלות', 'heading');
    assert(await t.page.locator('canvas').count() === 1, 'one canvas');
});

await test('teammates stay close, never hurt the player and fight the police', async (t) => {
    await t.open(true);
    let s = await t.snap();
    assert(s.bots && s.botList.length === 4, `teammates ${s.botList.length}`);
    assert(s.botList.every((b) => Math.hypot(b.x - s.player.x, b.z - s.player.z) < 8), 'they start next to the player');
    for (const sel of ['.hud-loc', '.climate-panel', '.hud-help', '.stage-panel', '.status-panel', '.crosshair', '.score-row']) assert(await t.visible(sel), `${sel} visible`);
    assert((await t.text('.stage-title')).includes('גבעת המדרגות'), 'first stage');
    assert((await t.text('.weapon-row strong')) === 'אקדח', 'starts with a pistol');
    await t.adv(15);
    assert((await t.snap()).player.hp === 100, 'teammates never shoot the player');
    await t.tp(22, 0, 100);
    await t.adv(25);
    s = await t.snap();
    assert(s.botList.some((b) => Math.hypot(b.x - 22, b.z - 100) < 25), 'they follow the player');
    await t.page.evaluate(() => { const d = window.__cityGame.debug; d.wanted(3); d.moveOfficer(0, 22, 0, 84); });
    let fought = false;
    for (let n = 0; n < 20 && !fought; n++) {
        await t.adv(1);
        fought = (await t.snap()).police.officers.some((o) => o.dead || o.hp < 100);
    }
    assert(fought, 'teammates shot at the police');
});
await test('start without bots: no opponents', async (t) => {
    await t.open(false);
    const s = await t.snap();
    assert(!s.bots && s.botList.length === 0, 'no bots');
    await t.adv(20);
    assert((await t.snap()).player.hp === 100, 'nobody hurts the player');
});

await test('menu: teammates on and off, reset progress, close', async (t) => {
    await t.open(false);
    await t.page.click('.menu-btn');
    assert(await t.visible('.game-menu'), 'menu opens');
    assert(!(await t.page.locator('.crosshair').count()), 'crosshair hidden while menu is open');
    assert(!(await t.page.locator('.admin-skip').count()), 'no admin buttons for a regular player');
    assert((await t.text('.bots-toggle')) === 'צירוף חברי צוות', 'teammates are off by default');
    await t.page.click('.bots-toggle');
    await until(async () => (await t.snap()).botList.length === 4, 'teammates join');
    assert((await t.text('.bots-toggle')) === 'שחרור חברי הצוות', 'label flips');
    await t.page.click('.bots-toggle');
    await until(async () => (await t.snap()).botList.length === 0, 'teammates leave');
    await t.emit('summit');
    assert((await t.snap()).progress.stage === 1, 'stage advanced');
    await t.page.click('.reset-progress');
    await until(async () => (await t.snap()).progress.stage === 0, 'reset');
    assert((await t.snap()).progress.weapons.join() === 'pistol', 'weapons reset');
    await t.page.click('.menu-close');
    assert(!(await t.page.locator('.game-menu').count()), 'menu closes');
});
await test('climate panel: weather, time slider, cycle, collapse and help toggle', async (t) => {
    await t.open(false);
    for (const [value, label] of [['cloudy', 'מעונן'], ['rain', 'גשום'], ['fog', 'ערפל'], ['clear', 'בהיר']]) {
        await t.page.selectOption('.climate-field select', value);
        assert((await t.snap()).weather === value, `weather ${label}`);
        await t.adv(1);
    }
    await t.page.click('.climate-cycle');
    assert((await t.text('.climate-cycle')).includes('הפעלת'), 'cycle label flips');
    await t.page.locator('.climate-range').fill('21.5');
    await until(async () => Math.abs((await t.snap()).hour - 21.5) < 0.05, 'hour set');
    assert((await t.text('.climate-time-row strong')) === '21:30', 'clock shows 21:30');
    await t.adv(5);
    assert(Math.abs((await t.snap()).hour - 21.5) < 0.05, 'time frozen while cycle is off');
    await t.page.click('.climate-cycle');
    await t.adv(10);
    assert((await t.snap()).hour > 21.9, 'time moves again');
    await t.page.click('.climate-toggle');
    assert(!(await t.page.locator('.climate-field').count()), 'panel collapses');
    await t.page.click('.climate-toggle');
    assert(await t.visible('.climate-field'), 'panel expands');
    await t.page.click('.hud-help .hud-btn');
    assert(!(await t.page.locator('.hud-help li').count()), 'help hides');
    await t.page.click('.hud-help .hud-btn');
    assert(await t.visible('.hud-help li'), 'help shows');
});

await test('walls hold, the door leads in, floor crates hold better guns higher up', async (t) => {
    await t.open(false);
    const b = world.buildings.find((x) => x.floors >= 12);
    await t.tp(b.x0 - 2, PAD_H, b.cz);
    await t.page.keyboard.down('KeyD');
    await t.page.evaluate(() => window.__cityGame.debug.look(Math.PI / 2, 0));
    await t.adv(2);
    await t.page.keyboard.up('KeyD');
    assert((await t.snap()).player.x < b.x0 + 0.1, 'west wall stops the player');
    await t.tp(b.door.x, PAD_H, b.door.zOut + 2);
    await t.page.evaluate(() => window.__cityGame.debug.look(0, 0));
    await t.hold('KeyW', 1.6);
    const inside = await t.snap();
    assert(inside.player.z < b.z1 - 0.5 && inside.player.z > b.z0, `walked through the door (z=${inside.player.z.toFixed(1)})`);
    await until(async () => (await t.text('.hud-loc-text')).includes(b.name), 'location names the building');
    const crates = world.pickups.filter((p) => p.building === b.index);
    for (const p of crates.filter((c) => c.kind !== 'med')) {
        await t.tp(p.x, p.y, p.z);
        await t.adv(0.3);
    }
    const s = await t.snap();
    assert(s.progress.crates >= crates.filter((c) => c.kind !== 'med').length - 1, 'crates collected');
    const best = crates.filter((c) => c.kind !== 'med').map((c) => c.kind);
    for (const k of new Set(best)) assert(s.progress.weapons.includes(k), `found a ${k}`);
});

await test('elevator to floor 20 and the roof, with the floor buttons', async (t) => {
    await t.open(false);
    await t.tp(tower.lift.x, PAD_H, tower.lift.z);
    await t.adv(0.4);
    await until(async () => (await t.snap()).prompt === 'lift', 'lift prompt');
    assert((await t.text('.interaction-prompt')).includes('מעלית'), 'prompt text');
    await t.press('KeyE');
    await t.page.waitForSelector('.elevator-dialog');
    assert((await t.page.locator('.elevator-floor-grid button').count()) === tower.floors + 1, 'one button per level');
    assert(await t.page.getByRole('button', { name: 'קרקע' }).isDisabled(), 'current floor is disabled');
    await t.page.getByRole('button', { name: '20', exact: true }).click();
    assert(!(await t.page.locator('.elevator-dialog').count()), 'dialog closes');
    await t.adv(6);
    const s = await t.snap();
    assert(Math.abs(s.player.y - levelY(tower, 20)) < 0.01, `arrived at y=${s.player.y}`);
    await until(async () => (await t.text('.hud-loc-text')).includes('קומה 20'), 'location says floor 20');
    await t.tp(tower.lift.x, levelY(tower, 20), tower.lift.z);
    await t.adv(0.4);
    await t.press('KeyE');
    await t.page.getByRole('button', { name: 'גג' }).click();
    await t.adv(3);
    assert(Math.abs((await t.snap()).player.y - tower.h) < 0.01, 'reached the roof');
    await t.tp(tower.lift.x, tower.h, tower.lift.z);
    await t.adv(0.4);
    await t.press('KeyE');
    await t.page.getByRole('button', { name: 'ביטול' }).click();
    assert(!(await t.page.locator('.elevator-dialog').count()), 'cancel closes');
});

await test('every stage in order: weapons, boats, helicopter and cash; progress survives reload', async (t) => {
    await t.open(false);
    await t.tp(hill.cx, hill.top, hill.cz);
    await t.adv(0.5);
    await until(async () => (await t.snap()).progress.stage === 1, 'summit stage');
    await until(async () => (await t.page.locator('.weapon-slot').count()) === 2, 'submachine gun slot');
    assert(await t.visible('.game-toast'), 'reward toast');
    await t.tp(tower.lift.x, PAD_H, tower.lift.z);
    await t.adv(0.4);
    await t.press('KeyE');
    await t.page.getByRole('button', { name: '5', exact: true }).click();
    await t.adv(2);
    await until(async () => (await t.snap()).progress.stage === 2, 'floor 5 stage');
    assert((await t.snap()).progress.cash === 5000, 'cash reward');
    for (const p of world.pickups.filter((c) => c.building === tower.index && c.level < 6).slice(0, 5)) {
        await t.tp(p.x, p.y, p.z);
        await t.adv(0.3);
    }
    await until(async () => (await t.snap()).progress.boats.includes('motor'), 'motor boat unlocked after 5 crates');
    await t.tp(tower.lift.x, PAD_H, tower.lift.z);
    for (const [e, v] of [['roof', 15], ['sail', 300], ['drive', 1000], ['floor', 20]]) await t.emit(e, v);
    const mid = (await t.snap()).progress;
    assert(['pistol', 'smg', 'shotgun', 'sniper'].every((w) => mid.weapons.includes(w)), `weapons ${mid.weapons}`);
    assert(mid.boats.join() === 'motor,speed' && mid.cash === 15000, `boats ${mid.boats}, cash ${mid.cash}`);
    await until(async () => (await t.text('.stage-title')).includes('20 ארגזי'), 'crate stage');
    for (let k = 0; k < 20; k++) await t.emit('crate');
    await until(async () => (await t.text('.stage-title')).includes('כספות'), 'robbery stage');
    assert((await t.snap()).progress.weapons.includes('rifle'), 'assault rifle');
    for (let k = 0; k < 3; k++) await t.emit('heist');
    await t.emit('escape', 3);
    await until(async () => (await t.text('.stage-title')).includes('כל השלבים'), 'all stages done');
    assert((await t.snap()).progress.cash === 60000, 'all cash rewards');
    await t.page.waitForTimeout(500);
    await t.page.reload({ waitUntil: 'networkidle' });
    await t.page.click('.start-play');
    await t.page.waitForSelector('.hud-loc');
    const saved = (await t.snap()).progress;
    assert(saved.stage === 10 && saved.weapons.length === 5, `progress restored: stage ${saved.stage}`);
});
await test('weapons: switch by key and button, fire, ammo, reload', async (t) => {
    await t.open(false);
    await t.emit('summit');
    await t.page.keyboard.press('Digit2');
    await until(async () => (await t.snap()).player.weapon === 'smg', 'key 2 selects the submachine gun');
    await t.page.keyboard.press('Digit1');
    await until(async () => (await t.snap()).player.weapon === 'pistol', 'key 1');
    await t.page.keyboard.press('KeyQ');
    await until(async () => (await t.snap()).player.weapon === 'smg', 'Q cycles');
    await t.page.locator('.weapon-slot', { hasText: 'אקדח' }).click();
    await until(async () => (await t.snap()).player.weapon === 'pistol', 'slot button');
    const before = (await t.snap()).player;
    await t.hold('KeyF', 1.4);
    const after = (await t.snap()).player;
    assert(after.mag < before.mag && before.mag - after.mag <= 6, `fired ${before.mag - after.mag} rounds`);
    await t.press('KeyR');
    await t.adv(2);
    const reloaded = (await t.snap()).player;
    assert(reloaded.mag === 12 && reloaded.reserve < before.reserve, `reloaded ${reloaded.mag}/${reloaded.reserve}`);
    await t.page.mouse.click(640, 380);
    await t.adv(0.5);
});

await test('shooting at an officer hurts them and raises the wanted level', async (t) => {
    await t.open(false);
    const result = await t.page.evaluate(() => {
        const g = window.__cityGame, d = g.debug;
        d.teleport(22, 0, 0);
        d.moveOfficer(0, 22, 0, -14);
        // Put the crosshair on the officer: the camera looks over the right shoulder.
        const aim = () => {
            const s = g.snapshot(), b = s.police.officers[0];
            let yaw = Math.atan2(-(b.x - s.player.x), -(b.z - s.player.z));
            const sx = s.player.x + Math.cos(yaw) * 0.55, sz = s.player.z - Math.sin(yaw) * 0.55;
            yaw = Math.atan2(-(b.x - sx), -(b.z - sz));
            d.look(yaw, Math.atan2(0.35, Math.hypot(b.x - sx, b.z - sz)));
        };
        let shots = 0;
        for (let n = 0; n < 60; n++) {
            const o = g.snapshot().police.officers[0];
            if (o.dead || o.hp < 100) break;
            aim();
            d.advance(0.05);
            g.setFire(true);
            d.advance(0.05);
            g.setFire(false);
            d.advance(0.25);
            shots++;
        }
        const s = g.snapshot();
        return { wanted: s.police.wanted, aggressive: s.police.aggressive, shots, hp: s.police.officers[0].hp };
    });
    assert(result.wanted >= 2 && result.aggressive, `shooting police should escalate: ${JSON.stringify(result)}`);
    await until(async () => t.visible('.wanted'), 'wanted stars shown');
});
await test('police open fire at three stars; dying respawns the player', async (t) => {
    await t.open(false);
    await t.page.evaluate(() => { const d = window.__cityGame.debug; d.teleport(22, 0, 0); d.wanted(3); d.moveOfficer(0, 22, 0, -16); });
    await t.adv(12);
    const hurt = await t.snap();
    assert(hurt.player.hp < 100 || hurt.progress.deaths > 0, `the police never hit anything (hp ${hurt.player.hp})`);
    await t.page.evaluate(() => window.__cityGame.debug.clearWanted());
    await t.adv(6);
    const deathsBefore = (await t.snap()).progress.deaths;
    await t.page.evaluate(() => window.__cityGame.debug.hurt(500));
    assert((await t.snap()).player.dead, 'dead');
    await until(async () => t.visible('.death-note'), 'death note');
    await t.adv(4);
    const back = await t.snap();
    assert(!back.player.dead && back.player.hp === 100 && Math.abs(back.player.z - 20.5) < 1, 'respawned at the start');
    assert(back.progress.deaths === deathsBefore + 1, 'death counted');
});
await test('officers follow the player through the door and up the elevator', async (t) => {
    await t.open(false);
    const lvl = 8;
    const b = world.buildings.find((x) => x.floors >= 12);
    await t.page.evaluate(([bx, bz, y, doorX, doorZ]) => {
        const d = window.__cityGame.debug;
        d.teleport(bx, y, bz);
        d.wanted(3);
        d.moveOfficer(0, doorX + 5, 0, doorZ + 6);
    }, [b.cx + 2, b.cz + 1, levelY(b, lvl), b.door.x, b.door.zOut]);
    let reached = false;
    for (let step = 0; step < 40 && !reached; step++) {
        await t.adv(1);
        const s = await t.snap();
        reached = s.police.officers.some((o) => o.y >= levelY(b, lvl) - 0.5) || s.player.hp < 100;
    }
    assert(reached, 'no officer made it up to the player');
});
await test('cars: the basic car is free, better cars are sold in the shop', async (t) => {
    await t.open(false);
    const cars = (await t.vehicles()).filter((v) => v.kind === 'car');
    assert(cars.find((v) => v.type === 'basic').unlocked, 'the basic car is free');
    assert(!cars.find((v) => v.type === 'super').unlocked, 'the super car is sold in the shop');
    const basic = cars.find((v) => v.type === 'basic');
    await t.tp(basic.x + 2.5, 0, basic.z);
    await t.adv(0.4);
    assert((await t.snap()).prompt === 'car', 'car prompt');
    await t.press('KeyE');
    assert((await t.snap()).mode === 'car', 'in the car');
    await t.hold('KeyW', 3);
    const v = (await t.snap()).vehicle;
    assert(v && v.speed > 10, `drove at ${v?.speed}`);
    assert((await t.text('.vehicle-hud')).includes('קמ״ש'), 'speedometer');
    await t.hold('KeyS', 4);
    await t.press('KeyE');
    assert((await t.snap()).mode === 'foot', 'got out');
    await t.page.evaluate(() => window.__cityGame.debug.setCash(90000));
    assert(await t.page.evaluate(() => window.__cityGame.shopBuy('car', 'super').ok), 'bought the super car');
    const fast = (await t.vehicles()).find((x) => x.type === 'super');
    assert(fast.unlocked, 'now unlocked');
    await t.tp(fast.x + 2.5, 0, fast.z);
    await t.adv(0.4);
    await t.press('KeyE');
    assert((await t.snap()).vehicle?.type === 'super', 'in the super car');
    await t.hold('KeyW', 3);
    assert((await t.snap()).vehicle.speed > v.speed, 'the super car is faster');
});
await test('running an officer over with a car raises the wanted level', async (t) => {
    await t.open(false);
    const basic = (await t.vehicles()).find((v) => v.type === 'basic');
    await t.tp(basic.x + 2.5, 0, basic.z);
    await t.adv(0.4);
    await t.press('KeyE');
    assert((await t.snap()).mode === 'car', 'in the car');
    await t.page.keyboard.down('KeyW');
    await t.adv(1.8);
    await t.page.evaluate(() => {
        const g = window.__cityGame, v = g.snapshot().vehicle;
        g.debug.moveOfficer(0, v.x + 3.5, 0, v.z);
        g.debug.advance(0.5);
    });
    await t.page.keyboard.up('KeyW');
    const s = await t.snap();
    assert(s.police.wanted >= 2, `officer not run over (wanted ${s.police.wanted})`);
});
await test('boats: locked, then sailing from the pier', async (t) => {
    await t.open(false);
    const boats = (await t.vehicles()).filter((v) => v.kind === 'boat');
    const motor = boats.find((v) => v.type === 'motor' && v.x > 0);
    assert(motor && !motor.unlocked, 'motor boat starts locked');
    await t.tp(2.4, world.pier.top, motor.z);
    await t.adv(0.4);
    assert((await t.snap()).prompt === 'locked', 'locked prompt on the pier');
    for (const [e, v] of [['summit', 1], ['floor', 5], ['crate', 1], ['crate', 1], ['crate', 1], ['crate', 1], ['crate', 1]]) await t.emit(e, v);
    await t.adv(0.4);
    assert((await t.snap()).prompt === 'boat', 'boat prompt after the stage');
    await t.press('KeyE');
    assert((await t.snap()).mode === 'boat', 'aboard');
    await t.hold('KeyW', 6);
    const v = (await t.snap()).vehicle;
    assert(v.z > motor.z + 10 && v.speed > 8, `sailed to z=${v.z.toFixed(0)}`);
    assert(await t.visible('.vehicle-hud'), 'boat HUD');
    await t.hold('KeyA', 2);
    await t.press('KeyE');
    assert((await t.snap()).mode === 'foot', 'left the boat');
    // The ship waits at the end of the pier and is open from the start.
    await t.tp(0, world.pier.top, world.pier.z1 - 1);
    await t.adv(0.4);
    assert((await t.snap()).prompt === 'boat' && (await t.text('.interaction-prompt')).includes('אונייה'), 'ship prompt');
    await t.press('KeyE');
    const ship = (await t.snap()).vehicle;
    assert(ship?.type === 'ship', 'aboard the ship');
    await t.hold('KeyW', 8);
    const sailed = (await t.snap()).vehicle;
    assert(sailed.speed > 4 && Math.hypot(sailed.x - ship.x, sailed.z - ship.z) > 15, `the ship sailed ${Math.hypot(sailed.x - ship.x, sailed.z - ship.z).toFixed(0)}m`);
    assert((await t.text('.vehicle-hud')).includes('אונייה'), 'ship HUD');
    await t.press('KeyE');
    assert((await t.snap()).mode === 'foot', 'left the ship');
    assert((await t.vehicles()).filter((x) => x.type === 'ship').length === 2, 'two ships at sea');
});

await test('swimming in the sea is possible and the beach lets you out', async (t) => {
    await t.open(false);
    await t.tp(40, 0, SEA_Z - 1);
    await t.page.evaluate(() => window.__cityGame.debug.look(Math.PI, 0));
    await t.hold('KeyW', 3);
    const wading = await t.snap();
    assert(wading.player.y < -0.5 && wading.player.z > SEA_Z + 3, `wading at y=${wading.player.y.toFixed(2)}`);
    await t.page.evaluate(() => window.__cityGame.debug.look(0, 0));
    await t.hold('KeyW', 6);
    assert((await t.snap()).player.y > -0.1, 'back on the beach');
});

await test('helicopter: take off, hover, land, get out', async (t) => {
    await t.open(false);
    const h = (await t.snap()).heli;
    await t.tp(h.x + 2.5, PAD_H, h.z);
    await t.adv(0.4);
    assert((await t.snap()).prompt === 'locked', 'the helicopter is locked during stage 1');
    await t.press('KeyE');
    await until(async () => (await t.text('.game-toast')).includes('שלב 1'), 'locked toast');
    assert((await t.snap()).mode === 'foot', 'did not get in');
    await t.emit('summit');
    await t.adv(0.4);
    assert((await t.snap()).prompt === 'heli', 'the helicopter opens at stage 2');
    await t.press('KeyE');
    assert((await t.snap()).mode === 'heli', 'in the helicopter');
    await t.hold('Space', 3);
    const up = await t.snap();
    assert(up.heli.y > 5, `climbed to ${up.heli.y.toFixed(1)}`);
    await t.press('KeyE');
    assert((await t.snap()).mode === 'heli', 'cannot jump out in the air');
    await t.hold('KeyW', 2);
    assert(Math.hypot((await t.snap()).heli.x - h.x, (await t.snap()).heli.z - h.z) > 5, 'flew forward');
    assert((await t.text('.vehicle-hud')).includes('מסוק'), 'heli HUD');
    await t.hold('ShiftLeft', 9);
    await t.press('KeyE');
    assert((await t.snap()).mode === 'foot', 'landed and stepped out');
});

await test('citizens: walk up, chat, scripted replies, close', async (t) => {
    await t.open(false);
    const c = (await t.page.evaluate(() => window.__cityGame.debug.citizens()))[0];
    await t.tp(c.x + 1.2, PAD_H, c.z);
    await t.adv(0.25);
    await until(async () => (await t.snap()).prompt === 'citizen', 'citizen prompt');
    await t.press('KeyE');
    await t.page.waitForSelector('.npc-chat-panel');
    assert((await t.text('.npc-chat-bubble.npc p')).includes('שלום'), 'greeting');
    assert(await t.page.locator('.npc-chat-form button').isDisabled(), 'send disabled when empty');
    await t.page.fill('.npc-chat-form input', 'איפה המסוק?');
    await t.page.click('.npc-chat-form button');
    await until(async () => (await t.page.locator('.npc-chat-bubble').count()) === 3, 'reply arrives');
    assert((await t.page.locator('.npc-chat-bubble.npc p').last().innerText()).includes('מסוק'), 'on-topic reply');
    const before = (await t.snap()).player;
    await t.hold('KeyW', 1);
    assert(Math.abs((await t.snap()).player.z - before.z) < 0.01, 'frozen while chatting');
    await t.page.click('.npc-chat-close');
    assert(!(await t.page.locator('.npc-chat-panel').count()), 'closed');
});

await test('pickup crates respawn and medkits heal', async (t) => {
    await t.open(false);
    const med = world.pickups.find((p) => p.kind === 'med' && p.level === 0);
    await t.page.evaluate(() => window.__cityGame.debug.hurt(60));
    await t.tp(med.x, med.y, med.z);
    await t.adv(0.4);
    const hp = (await t.snap()).player.hp;
    assert(hp > 60, `healed to ${hp}`);
    const used = (await t.page.evaluate(() => window.__cityGame.debug.crates())).find((p) => p.id === med.id);
    assert(!used.ready, 'crate hidden after pickup');
    await t.tp(SEA_Z > 0 ? 22 : 0, 0, 0);
    await t.adv(95);
    const again = (await t.page.evaluate(() => window.__cityGame.debug.crates())).find((p) => p.id === med.id);
    assert(again.ready, 'crate is back after 90s');
});

await test('phone layout: touch controls, no overflow, fire and reload buttons', async (t) => {
    await t.page.goto(`${BASE}/city`, { waitUntil: 'networkidle', timeout: 120000 });
    await t.page.evaluate(() => localStorage.clear());
    const fit = await t.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    assert(fit, 'start screen fits the width');
    await t.page.tap('.start-play');
    await t.page.waitForSelector('.hud-loc');
    for (const sel of ['.joy', '.jump-btn', '.fire-btn', '.reload-btn', '.switch-btn']) assert(await t.visible(sel), `${sel} visible`);
    assert(await t.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'HUD fits the width');
    const before = (await t.snap()).player.mag;
    const box = await t.page.locator('.fire-btn').boundingBox();
    await t.page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    const fireBtn = t.page.locator('.fire-btn');
    await fireBtn.dispatchEvent('pointerdown', { pointerId: 7, pointerType: 'touch' }).catch(() => {});
    await t.adv(0.5);
    await fireBtn.dispatchEvent('pointerup', { pointerId: 7, pointerType: 'touch' }).catch(() => {});
    assert((await t.snap()).player.mag < before, 'fire button shoots');
    await t.page.tap('.reload-btn');
    await t.adv(2);
    assert((await t.snap()).player.mag === 12, 'reload button works');
    await t.page.tap('.switch-btn');
    await t.page.tap('.climate-toggle');
    assert(await t.visible('.climate-field'), 'climate panel opens by touch');
    await t.page.tap('.climate-toggle');
    await t.page.tap('.menu-btn');
    assert(await t.visible('.game-menu'), 'menu opens by touch');
}, { device: 'iPhone 13' });

await test('robbing a safe: alarm, cash, police chase, escape by car', async (t) => {
    await t.open(false);
    const biz = (await t.page.evaluate(() => window.__cityGame.debug.businesses())).find((b) => b.type === 'market');
    const b = world.buildings[biz.building];
    await t.tp(biz.safe.x - 1.1, PAD_H, biz.safe.z + 1.1);
    await t.adv(0.4);
    await until(async () => (await t.snap()).prompt === 'safe', 'safe prompt');
    assert((await t.text('.interaction-prompt')).includes(biz.name), 'prompt names the business');
    await t.press('KeyE');
    await t.adv(0.3);
    await until(async () => t.visible('.heist-panel'), 'cracking bar');
    assert((await t.snap()).police.wanted === 1, 'alarm: one star');
    await until(async () => t.visible('.wanted'), 'stars shown');
    await t.adv(biz.crack + 0.5);
    const after = await t.snap();
    assert(after.progress.cash >= biz.cash[0] && after.progress.heists === 1, `cash ${after.progress.cash}`);
    assert(after.police.wanted >= biz.heat, 'wanted level from the business');
    await until(async () => (await t.text('.cash-row strong')).includes('₪'), 'cash in the HUD');
    assert((await t.page.evaluate(() => window.__cityGame.debug.businesses())).find((x) => x.id === biz.id).robbed, 'safe emptied');
    await t.adv(0.4);
    assert((await t.snap()).prompt === 'emptySafe', 'empty safe prompt');
    // Take a car and drive off with the police on their way.
    assert((await t.snap()).police.cars.length >= 5, 'police cars on the road');
    const car = (await t.vehicles()).find((v) => v.type === 'basic');
    await t.tp(car.x + 2.5, 0, car.z);
    await t.adv(0.3);
    await t.press('KeyE');
    assert((await t.snap()).mode === 'car', 'getaway car');
    await t.hold('KeyW', 3);
    const chase = await t.snap();
    assert(chase.police.wanted >= 1 && chase.police.cars.some((c) => Math.abs(c.speed) > 3), 'police cars are moving in');
    // Hide far out at sea until the search is called off.
    await t.page.keyboard.press('KeyE');
    await t.tp(0, -0.35, SEA_Z + 260);
    await t.adv(40);
    const free = await t.snap();
    assert(free.police.wanted === 0, `still wanted (${free.police.wanted}, unseen ${free.police.unseen.toFixed(1)})`);
    assert(free.progress.escapes >= 1, 'escape counted');
    assert(!(await t.page.locator('.wanted').count()), 'stars cleared');
});

await test('police: shooting near them, arrest, and the menu switch', async (t) => {
    await t.open(false);
    await t.page.evaluate(() => window.__cityGame.debug.wanted(1));
    await t.adv(25);
    const s = await t.snap();
    assert(s.police.officers.length > 0 || s.progress.arrests > 0, 'officers came');
    await t.adv(40);
    const after = await t.snap();
    assert(after.progress.arrests >= 1 || after.police.wanted === 0, 'arrested standing still');
    await t.page.click('.menu-btn');
    await t.page.click('.police-toggle');
    await until(async () => !(await t.snap()).police.on, 'police off');
    assert((await t.text('.police-toggle')) === 'הפעלת המשטרה', 'label flips');
    assert((await t.snap()).police.cars.length === 0, 'no police cars');
    await t.page.click('.police-toggle');
    await until(async () => (await t.snap()).police.cars.length === 5, 'patrols back');
    assert((await t.snap()).police.officers.length === 4, 'beat officers back');
});

await test('police are on the streets from the start, near the player', async (t) => {
    await t.open(false);
    const s = await t.snap();
    assert(s.police.cars.length === 5 && s.police.officers.length === 4, `cars ${s.police.cars.length}, officers ${s.police.officers.length}`);
    assert(s.police.cars.some((c) => Math.hypot(c.x - s.player.x, c.z - s.player.z) < 40), 'a patrol car near the start');
    assert(s.police.officers.some((o) => Math.hypot(o.x - s.player.x, o.z - s.player.z) < 40), 'an officer near the start');
    await t.adv(20);
    const later = await t.snap();
    assert(later.police.wanted === 0 && later.player.hp === 100, 'they leave an innocent player alone');
    assert(later.police.cars.some((c, n) => Math.hypot(c.x - s.police.cars[n].x, c.z - s.police.cars[n].z) > 20), 'patrol cars drive around');
});

await test('every building has a business with a sign and a safe', async (t) => {
    await t.open(false);
    const list = await t.page.evaluate(() => window.__cityGame.debug.businesses());
    assert(list.length === world.buildings.length && list.length === 44, `businesses ${list.length}`);
    const biz = list[list.length - 1];
    await t.tp(biz.safe.x - 1.1, PAD_H, biz.safe.z + 1.1);
    await t.adv(0.4);
    assert((await t.snap()).prompt === 'safe', 'the last building has a safe to crack too');
    assert((await t.text('.hud-loc-text')).includes(biz.name), 'the location names the business');
});

await test('admin sign-in: wrong code refused; admin cannot be hurt and has everything', async (t) => {
    await t.page.goto(`${BASE}/city`, { waitUntil: 'networkidle', timeout: 120000 });
    await t.page.click('.start-admin');
    await t.page.fill('.admin-code', 'not-the-code');
    await t.page.click('.admin-enter');
    await t.page.waitForSelector('.admin-error');
    assert(!(await t.page.locator('.hud-loc').count()), 'a wrong code does not start the game');
    const code = process.env.ADMIN_CODE;
    if (!code) {
        console.log('       (ADMIN_CODE is not set: the signed-in half of this test was skipped)');
        return;
    }
    await t.page.fill('.admin-code', code);
    await t.page.click('.admin-enter');
    await t.page.waitForSelector('.hud-loc');
    await t.page.evaluate(() => window.__cityGame.debug.pause(true));
    await t.adv(0.5);
    assert((await t.snap()).admin, 'signed in as admin');
    await until(async () => t.visible('.admin-badge'), 'admin badge');
    assert((await t.page.locator('.weapon-slot').count()) === 5, 'all five weapons');
    await t.page.evaluate(() => window.__cityGame.debug.hurt(500));
    const s = await t.snap();
    assert(s.player.hp === 100 && !s.player.dead, 'the admin cannot be hurt');
    await t.page.evaluate(() => { const d = window.__cityGame.debug; d.teleport(22, 0, 0); d.wanted(5); d.moveOfficer(0, 22, 0, -10); });
    await t.adv(15);
    const shot = await t.snap();
    assert(shot.player.hp === 100 && shot.progress.deaths === 0 && shot.progress.arrests === 0, 'police cannot kill or arrest the admin');
    assert((await t.vehicles()).every((v) => v.unlocked), 'every car, boat and ship is unlocked');
    await t.tp(shot.heli.x + 2.5, PAD_H, shot.heli.z);
    await t.adv(0.4);
    assert((await t.snap()).prompt === 'heli', 'the helicopter is open at stage 1 for the admin');
    await t.page.click('.menu-btn');
    await t.page.click('.admin-clear');
    await until(async () => (await t.snap()).police.wanted === 0, 'police called off');
    await t.page.click('.admin-skip');
    await until(async () => (await t.snap()).progress.stage === 1, 'stage skipped');
    for (let n = 0; n < 9; n++) await t.page.click('.admin-skip');
    await until(async () => (await t.snap()).progress.stage === 10, 'all stages skipped');
    assert((await t.text('.stage-title')).includes('כל השלבים'), 'finished');
});

await test('shop: a kiosk in the park sells a weapon for cash', async (t) => {
    await t.open(false);
    const k = await t.page.evaluate(() => window.__cityGame.debug.world.shop);
    await t.page.evaluate(() => window.__cityGame.debug.setCash(5000));
    await t.tp(k.x + 3, PAD_H, k.z + 0.5);
    await t.adv(0.4);
    assert((await t.snap()).prompt === 'shop', 'shop prompt');
    await t.press('KeyE');
    await t.page.waitForSelector('.shop-dialog');
    assert((await t.text('.shop-cash')).includes('5,000'), 'cash shown in the shop');
    await t.page.locator('.shop-item', { hasText: 'תת־מקלע' }).locator('button').click();
    await until(async () => (await t.snap()).progress.weapons.includes('smg'), 'submachine gun bought');
    assert((await t.text('.shop-msg')).includes('נרכש'), 'purchase message');
    assert((await t.snap()).progress.cash === 2500, 'paid 2500');
    await t.page.click('.shop-close');
    assert(!(await t.page.locator('.shop-dialog').count()), 'shop closes');
});

await test('the cable car stops on every roof and takes passengers', async (t) => {
    await t.open(false);
    const c0 = await t.page.evaluate(() => window.__cityGame.debug.cable());
    assert(c0.stops === 44, `stops ${c0.stops}`);
    await t.tp(c0.x, c0.y, c0.z);
    await t.adv(0.4);
    assert((await t.snap()).prompt === 'cableBoard', `prompt ${(await t.snap()).prompt}`);
    await t.press('KeyE');
    assert((await t.snap()).mode === 'cable', 'boarded');
    let c1 = c0;
    for (let n = 0; n < 120; n++) {
        await t.adv(0.5);
        c1 = await t.page.evaluate(() => window.__cityGame.debug.cable());
        if (c1.atStop && c1.stopId !== c0.stopId) break;
    }
    assert(c1.atStop && c1.stopId !== c0.stopId, 'the cabin stopped at another roof');
    assert((await t.snap()).prompt === 'cableExit', `exit prompt ${(await t.snap()).prompt}`);
    await t.press('KeyE');
    const s = await t.snap();
    assert(s.mode === 'foot', 'got off');
    assert(Math.abs(s.player.y - c1.y) < 0.3, `on the roof (y ${s.player.y.toFixed(1)}, roof ${c1.y.toFixed(1)})`);
});

await test('the rest of the site still serves (home page)', async (t) => {
    const res = await t.page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    assert(res.status() === 200, `status ${res.status()}`);
});

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
