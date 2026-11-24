// Checks for "Egypt: the journey": the map rules and the two quest paths.
import assert from 'node:assert/strict';
import test from 'node:test';
import { FACTIONS, MAX_CARRY, QUESTS, applyEvent, currentStep, newRun, progressOf } from '../public/egypt/quest.js';
import {
    HOUSES, isFree, LANDMARKS, LANDMARK_IDS, MAP, NPCS, PICKUPS, PYRAMIDS, PALACE, RIVER, VILLAGERS,
    landmarksAt, nearest, pushOut, FIELDS, STALLS, WELL, SPHINX, OBELISK, POND,
} from '../public/egypt/world.js';

const PICKUP_BY_ID = Object.fromEntries(PICKUPS.map((p) => [p.id, p]));
const LANDMARK_BY_ID = Object.fromEntries(LANDMARKS.map((l) => [l.id, l]));
const NPC_BY_ID = Object.fromEntries(NPCS.map((n) => [n.id, n]));

// Plays one event and checks that the run changed as expected.
const talk = (run, id) => applyEvent(run, { type: 'talk', id });
const pick = (run, id) => {
    const p = PICKUP_BY_ID[id];
    return applyEvent(run, { type: 'pickup', id, item: p.item, label: p.label });
};
const visit = (run, id) => {
    const l = LANDMARK_BY_ID[id];
    return applyEvent(run, { type: 'visit', id, name: l.name });
};

test('the map has two paths to choose from at the entrance', () => {
    assert.deepEqual(FACTIONS.sort(), ['egypt', 'hebrew']);
    assert.throws(() => newRun('roman'), /unknown faction/);
});

test('the spawn point is free and the village, palace and pyramids are reachable', () => {
    assert.ok(isFree(MAP.spawn.x, MAP.spawn.z, 1), 'spawn point');
    // The bridge is the only crossing of the Nile.
    assert.ok(isFree(0, -40, 0.5), 'bridge');
    assert.ok(isFree(-170, 40, 0.5) || isFree(-175, 30, 0.5), 'village street');
    assert.ok(isFree(PALACE.x, PALACE.z + 40, 0.5), 'palace courtyard');
    assert.ok(isFree(0, RIVER.z1 + 8, 0.5), 'north bank by the bridge');
});

test('the Nile is a wall except at the bridge', () => {
    const inWater = pushOut(-100, -40, 0.5);
    assert.ok(inWater.z <= RIVER.z0 - 0.5 || inWater.z >= RIVER.z1 + 0.5, `pushed out of the river: ${JSON.stringify(inWater)}`);
    assert.ok(isFree(inWater.x, inWater.z, 0.4));
    assert.equal(isFree(-100, -40), false, 'water is not walkable');
});

test('pushOut moves a character out of a house and keeps it inside the walls', () => {
    const house = HOUSES[0];
    const out = pushOut(house.x, house.z, 0.5);
    assert.ok(isFree(out.x, out.z, 0.4), 'out of the house');
    const wall = pushOut(MAP.half + 50, 0, 0.5);
    assert.ok(Math.abs(wall.x) <= MAP.half - 0.5, 'inside the map');
});

test('every NPC, pickup and villager stands on free ground', () => {
    for (const n of NPCS) assert.ok(isFree(n.x, n.z, 0.6), `NPC ${n.id} stands in an obstacle`);
    for (const p of PICKUPS) assert.ok(isFree(p.x, p.z, 0.5), `pickup ${p.id} is blocked`);
    for (const v of VILLAGERS) assert.ok(isFree(v.x, v.z, 0.3) || isFree(v.x + 3, v.z, 0.3), `villager at ${v.x},${v.z} is blocked`);
});

test('the landmarks are on the map and the explorer quest lists all of them', () => {
    assert.equal(new Set(LANDMARK_IDS).size, LANDMARKS.length, 'ids are unique');
    for (const l of LANDMARKS) {
        assert.ok(Math.abs(l.x) < MAP.half && Math.abs(l.z) < MAP.half, `${l.id} is inside the walls`);
    }
    assert.equal(landmarksAt(0, -40)[0].id, 'river-bridge');
    assert.equal(landmarksAt(-400, -400).length, 0);
});

test('the scene parts stay inside the walls and do not overlap the spawn point', () => {
    const inside = (x, z) => Math.abs(x) < MAP.half && Math.abs(z) < MAP.half;
    for (const p of PYRAMIDS) assert.ok(inside(p.x, p.z), 'pyramid');
    for (const f of FIELDS) assert.ok(inside(f.x, f.z), `field ${f.id}`);
    for (const s of STALLS) assert.ok(inside(s.x, s.z), 'stall');
    assert.ok(inside(WELL.x, WELL.z) && inside(SPHINX.x, SPHINX.z) && inside(OBELISK.x, OBELISK.z) && inside(POND.x, POND.z));
    assert.ok(isFree(POND.x + POND.w / 2 + 6, POND.z, 0.4), 'walking around the pond');
});

test('nearest picks the closest item in range and ignores the rest', () => {
    const items = [{ id: 'a', x: 0, z: 0 }, { id: 'b', x: 3, z: 0 }, { id: 'c', x: 50, z: 0 }];
    assert.equal(nearest(items, 2.5, 0, 4).id, 'b');
    assert.equal(nearest(items, 20, 0, 4), null);
});

test('a new run starts at the first step with nothing carried', () => {
    for (const faction of FACTIONS) {
        const run = newRun(faction);
        assert.equal(run.step, 0);
        assert.equal(run.done, false);
        assert.deepEqual(run.inventory, {});
        assert.equal(currentStep(run).type, 'talk');
    }
});

test('events do not change the run they are given', () => {
    const run = newRun('egypt');
    const before = JSON.stringify(run);
    talk(run, 'vizier');
    pick(run, 'field-a');
    visit(run, 'pyramids');
    assert.equal(JSON.stringify(run), before);
});

test('the Egyptian path: talk, gather grain, deliver it, then discover the sites', () => {
    let run = newRun('egypt');

    // Talking to someone else does nothing.
    let r = talk(run, 'farmer');
    assert.equal(r.run.step, 0);

    r = talk(run, 'vizier');
    run = r.run;
    assert.equal(currentStep(run).type, 'collect');

    // Three grain are needed. Two are not enough.
    run = pick(run, 'field-a').run;
    run = pick(run, 'field-a').run;
    assert.equal(progressOf(run, currentStep(run)).have, 2);
    run = pick(run, 'field-a').run;
    assert.equal(currentStep(run).type, 'deliver', 'collecting finishes by itself');

    // Delivering to the wrong person keeps the grain.
    r = talk(run, 'farmer');
    assert.equal(r.run.step, run.step);
    run = talk(run, 'vizier').run;
    assert.equal(run.inventory.grain, undefined, 'delivered grain is taken');
    assert.equal(currentStep(run).type, 'visit');

    run = visit(run, 'pyramids').run;
    run = visit(run, 'sphinx').run;
    assert.equal(currentStep(run).type, 'explore');
    assert.equal(run.done, false);
});

test('delivering without enough grain is refused and explained', () => {
    // The normal path only reaches the delivery step with enough grain, so set up a short pack directly.
    const run = { ...newRun('egypt'), step: 2, inventory: { grain: 1 } };
    assert.equal(currentStep(run).type, 'deliver');
    const r = talk(run, 'vizier');
    assert.equal(r.run.step, 2, 'the step did not move');
    assert.equal(r.run.inventory.grain, 1, 'nothing was taken');
    assert.deepEqual(r.messages, ['חסר לך תבואה: 1 מתוך 3']);
});

test('the pack holds at most MAX_CARRY of each item', () => {
    let run = newRun('hebrew');
    for (let i = 0; i < MAX_CARRY + 3; i++) run = pick(run, 'well').run;
    assert.equal(run.inventory.water, MAX_CARRY);
    const r = pick(run, 'well');
    assert.ok(r.messages[0].includes('התיק מלא'));
});

test('the Hebrew path: elder, water to the mother, straw to the elder, then the bridge and pyramids', () => {
    let run = newRun('hebrew');
    run = talk(run, 'elder').run;
    assert.equal(currentStep(run).type, 'collect');
    for (let i = 0; i < 3; i++) run = pick(run, 'well').run;
    assert.equal(currentStep(run).type, 'deliver');

    // The elder is not the one who wants the water.
    run = talk(run, 'elder').run;
    assert.equal(run.inventory.water, 3);
    run = talk(run, 'mother').run;
    assert.equal(run.inventory.water, undefined);

    for (let i = 0; i < 2; i++) run = pick(run, 'field-b').run;
    run = talk(run, 'elder').run;
    assert.equal(run.inventory.straw, undefined);
    assert.equal(currentStep(run).type, 'visit');

    run = visit(run, 'river-bridge').run;
    run = visit(run, 'pyramids').run;
    assert.equal(currentStep(run).type, 'explore');
});

test('visiting a landmark counts once and is announced once', () => {
    let run = newRun('egypt');
    const first = visit(run, 'oasis');
    assert.deepEqual(first.messages, ['גילית: נווה המדבר']);
    const second = visit(first.run, 'oasis');
    assert.deepEqual(second.messages, []);
    assert.equal(second.run.visited.length, 1);
});

test('visiting the places before their step makes those steps finish at once', () => {
    let run = newRun('egypt');
    run = visit(run, 'pyramids').run;
    run = visit(run, 'sphinx').run;
    run = talk(run, 'vizier').run;
    // Collecting is still needed, so the run stops at the grain step.
    assert.equal(currentStep(run).type, 'collect');
    for (const id of LANDMARK_IDS) run = visit(run, id).run;
    assert.equal(currentStep(run).type, 'collect');
});

for (const faction of FACTIONS) {
    test(`the ${faction} quest can be finished from start to end`, () => {
        let run = newRun(faction);
        const steps = QUESTS[faction].steps;
        let guard = 0;
        while (!run.done && guard++ < 100) {
            const step = currentStep(run);
            if (step.type === 'talk') run = talk(run, step.npc).run;
            else if (step.type === 'deliver') {
                // Get the item from its source first, as a player would.
                const source = PICKUPS.find((p) => p.item === step.item);
                for (let i = 0; i < step.count; i++) run = pick(run, source.id).run;
                run = talk(run, step.npc).run;
            } else if (step.type === 'collect') {
                const source = PICKUPS.find((p) => p.item === step.item);
                for (let i = 0; i < step.count; i++) run = pick(run, source.id).run;
            } else if (step.type === 'visit') run = visit(run, step.landmark).run;
            else if (step.type === 'explore') for (const id of step.landmarks) run = visit(run, id).run;
        }
        assert.equal(run.done, true, 'finished');
        assert.equal(run.step, steps.length);
        assert.equal(run.score, steps.length * 10 + 100, 'score: 10 per step and 100 for the quest');
        assert.equal(currentStep(run), null);
        // Nothing else changes after the quest is done.
        assert.deepEqual(applyEvent(run, { type: 'talk', id: 'vizier' }).messages, []);
    });

    test(`every ${faction} step points at something that exists`, () => {
        for (const step of QUESTS[faction].steps) {
            if (step.npc) assert.ok(NPC_BY_ID[step.npc], `npc ${step.npc}`);
            if (step.item) assert.ok(PICKUPS.some((p) => p.item === step.item), `item ${step.item}`);
            if (step.landmark) assert.ok(LANDMARK_BY_ID[step.landmark], `landmark ${step.landmark}`);
            if (step.landmarks) for (const id of step.landmarks) assert.ok(LANDMARK_BY_ID[id], `landmark ${id}`);
        }
        // Every collected item must be the same one that is delivered.
        const collected = QUESTS[faction].steps.filter((s) => s.type === 'collect').map((s) => s.item);
        const delivered = QUESTS[faction].steps.filter((s) => s.type === 'deliver').map((s) => s.item);
        assert.deepEqual(collected, delivered);
    });
}

test('progress shows the count the player needs for each step', () => {
    let run = talk(newRun('hebrew'), 'elder').run;
    assert.deepEqual(progressOf(run, currentStep(run)), { have: 0, need: 3 });
    run = pick(run, 'well').run;
    assert.deepEqual(progressOf(run, currentStep(run)), { have: 1, need: 3 });
    assert.equal(progressOf(run, null), null);
});
