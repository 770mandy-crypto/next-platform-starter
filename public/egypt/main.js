// Egypt: the journey. The 3D scene, the player, the villagers and the HUD.
// The rules live in world.js and quest.js; this file only draws them and reacts to the player.

import * as THREE from 'three';
import {
    FIELDS, HOUSES, LANDMARKS, MAP, NPCS, OBELISK, PALACE, PALACE_COLUMNS, PALACE_WALLS, PICKUPS, POND,
    PYRAMIDS, RIVER, RIVER_RECTS, SPHINX, STALLS, VILLAGERS, WALLS, WELL, isFree, landmarksAt, nearest, pushOut,
} from './world.js';
import { FACTIONS, QUESTS, applyEvent, currentStep, newRun, progressOf } from './quest.js';

// ---------- helpers

function mulberry32(seed) {
    let a = seed;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const rand = mulberry32(20240);

const matCache = new Map();
function lam(color) {
    if (!matCache.has(color)) matCache.set(color, new THREE.MeshLambertMaterial({ color }));
    return matCache.get(color);
}

function shadow(mesh, cast = true) {
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    return mesh;
}

function slab(r, y0, y1, color, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(r.x1 - r.x0, y1 - y0, r.z1 - r.z0), lam(color));
    m.position.set((r.x0 + r.x1) / 2, (y0 + y1) / 2, (r.z0 + r.z1) / 2);
    (parent || scene).add(shadow(m));
    return m;
}

function block(x, y, z, w, h, d, color, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(color));
    m.position.set(x, y, z);
    (parent || scene).add(shadow(m));
    return m;
}

function sandTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#e2c48c';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
        g.fillStyle = rand() < 0.5 ? 'rgba(255,240,205,0.28)' : 'rgba(160,110,50,0.16)';
        g.fillRect(rand() * 256, rand() * 256, 2 + rand() * 3, 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(160, 160);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

function tileTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#eadcb4';
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#b89c6c';
    g.lineWidth = 3;
    g.strokeRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 1);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

// A text label drawn to a canvas, used for names and place names.
function label(text, { color = '#fff8e6', bg = 'rgba(40,22,6,0.7)', width = 2.8 } = {}) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = bg;
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = color;
    g.font = 'bold 30px Heebo, Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 128, 34);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    s.scale.set(width, width / 4, 1);
    s.renderOrder = 10;
    return s;
}

// ---------- renderer, camera and light

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const HORIZON = 0xe9d2a2;
const scene = new THREE.Scene();
scene.background = new THREE.Color(HORIZON);
scene.fog = new THREE.Fog(HORIZON, 260, 760);

const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 1400);
scene.add(new THREE.HemisphereLight(0xfff4dc, 0x9a7340, 1.0));
const sun = new THREE.DirectionalLight(0xfff0cf, 1.8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 1, far: 500 });
sun.shadow.bias = -0.0006;
scene.add(sun, sun.target);

// ---------- the map

function buildGround() {
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(1400, 1400),
        new THREE.MeshLambertMaterial({ map: sandTexture() }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Dunes beyond the walls.
    const dune = new THREE.SphereGeometry(1, 14, 8);
    for (let i = 0; i < 70; i++) {
        let x;
        let z;
        do {
            x = (rand() - 0.5) * 1100;
            z = (rand() - 0.5) * 1100;
        } while (Math.abs(x) < MAP.half + 30 && Math.abs(z) < MAP.half + 30);
        const s = 18 + rand() * 30;
        const m = new THREE.Mesh(dune, lam(0xd6b070));
        m.scale.set(s, 4 + rand() * 5, s * (0.7 + rand() * 0.5));
        m.position.set(x, 0, z);
        m.receiveShadow = true;
        scene.add(m);
    }
}

function buildRiver() {
    const water = new THREE.MeshLambertMaterial({ color: 0x2f86ad });
    const bank = lam(0xc9a46a);
    const plane = (r, y, mat) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(r.x1 - r.x0, r.z1 - r.z0), mat);
        m.rotation.x = -Math.PI / 2;
        m.position.set((r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2);
        m.receiveShadow = true;
        scene.add(m);
    };
    for (const r of RIVER_RECTS) plane(r, 0.05, water);
    // Banks are slightly raised strips on both sides.
    plane({ x0: -MAP.half, x1: MAP.half, z0: RIVER.z0 - 3, z1: RIVER.z0 }, 0.03, bank);
    plane({ x0: -MAP.half, x1: MAP.half, z0: RIVER.z1, z1: RIVER.z1 + 3 }, 0.03, bank);

    // The bridge: a deck with a rail on each side.
    const b = RIVER.bridge;
    const deck = block((b.x0 + b.x1) / 2, 0.9, (b.z0 + b.z1) / 2, b.x1 - b.x0, 0.5, b.z1 - b.z0, 0x8a5a2b);
    deck.castShadow = true;
    for (const x of [b.x0 + 0.4, b.x1 - 0.4]) {
        block(x, 1.6, (b.z0 + b.z1) / 2, 0.4, 1.2, b.z1 - b.z0, 0x6b4520);
    }
    // Reeds along the banks.
    for (let i = 0; i < 120; i++) {
        const x = (rand() - 0.5) * 2 * MAP.half;
        const z = rand() < 0.5 ? RIVER.z0 - 0.5 - rand() * 2 : RIVER.z1 + 0.5 + rand() * 2;
        if (Math.abs(x) < 9) continue;
        for (let k = 0; k < 3; k++) {
            const reed = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.4 + rand() * 0.8, 5), lam(0x6f9a3a));
            reed.position.set(x + (rand() - 0.5), 0.7, z + (rand() - 0.5));
            scene.add(reed);
        }
    }
}

function buildWalls() {
    for (const r of WALLS) {
        slab(r, 0, 9, 0xc9a66b);
        slab(r, 9, 9.7, 0x8e6a3f);
    }
    // Gate towers.
    for (const x of [-15, 15]) {
        block(x, 9, 316, 6, 18, 6, 0xc9a66b);
        block(x, 18.5, 316, 7, 1.2, 7, 0x8e6a3f);
    }
    block(0, 15.5, 316, 36, 3, 6, 0xb88a55);
}

function buildPalace() {
    for (const r of PALACE_WALLS) {
        slab(r, 0, 8, 0xd8c39a);
        slab(r, 8, 8.8, 0x2f7fa6); // blue frieze on top
    }
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(PALACE.x1 - PALACE.x0 - 4, PALACE.z1 - PALACE.z0 - 4),
        new THREE.MeshLambertMaterial({ map: tileTexture() }),
    );
    floor.material.map.repeat.set(12, 9);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(PALACE.x, 0.06, PALACE.z);
    floor.receiveShadow = true;
    scene.add(floor);

    for (const c of PALACE_COLUMNS) {
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 8, 12), lam(0xe2d3ae));
        shaft.position.set(c.x, 4, c.z);
        scene.add(shadow(shaft));
        block(c.x, 8.4, c.z, 2.6, 0.8, 2.6, 0x2f7fa6);
        block(c.x, 0.4, c.z, 2.4, 0.8, 2.4, 0xc9b58a);
        block(c.x, 8.9, c.z, 2.2, 0.5, 2.2, 0xd4a017);
    }

    // The gate lintel and the throne room at the back.
    block((PALACE.gate.x0 + PALACE.gate.x1) / 2, 8.4, PALACE.z1 - 2, PALACE.gate.x1 - PALACE.gate.x0 + 4, 1.4, 4, 0xd4a017);
    block(PALACE.x, 0.5, PALACE.z0 + 10, 12, 1, 6, 0xb3352a);
    for (const x of [-4, 4]) block(PALACE.x + x, 5, PALACE.z0 + 10, 0.6, 9, 0.6, 0xd4a017);
    block(PALACE.x, 9.4, PALACE.z0 + 10, 11, 0.8, 7, 0x2f7fa6);
    block(PALACE.x, 2.2, PALACE.z0 + 10, 3, 2.6, 2, 0x3a2a1a); // the throne
}

function buildPyramids() {
    for (const p of PYRAMIDS) {
        const r = p.base / Math.SQRT2;
        const m = new THREE.Mesh(
            new THREE.ConeGeometry(r, p.h, 4),
            new THREE.MeshLambertMaterial({ color: 0xf7f0dc, flatShading: true }),
        );
        m.rotation.y = Math.PI / 4;
        m.position.set(p.x, p.h / 2, p.z);
        scene.add(shadow(m));
    }
    // A stone causeway and a temple court in front of the big pyramid.
    slab({ x0: 70, x1: 170, z0: -110, z1: -102 }, 0, 0.3, 0xd9c08c);
}

function buildSphinx() {
    const s = SPHINX;
    const x = s.x;
    const z = s.z;
    block(x - 3, 2.6, z, s.len - 6, 5.2, s.w, 0xc8a96a);
    block(x + s.len / 2 - 3, 4.6, z, 5, 5, s.w + 1, 0xcbab70);
    block(x + s.len / 2 - 3, 7.3, z, 5.4, 1.2, s.w + 1.4, 0xd4a017); // headdress
    block(x + s.len / 2 - 1, 3.2, z, 3, 3, s.w + 2, 0xbf9d5e); // paws
}

function buildObelisk() {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.1, 26, 4), lam(0xc9a25a));
    m.rotation.y = Math.PI / 4;
    m.position.set(OBELISK.x, 13, OBELISK.z);
    scene.add(shadow(m));
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.2, 4), new THREE.MeshLambertMaterial({ color: 0xffd34d }));
    tip.rotation.y = Math.PI / 4;
    tip.position.set(OBELISK.x, 27.1, OBELISK.z);
    scene.add(tip);
}

function buildPond() {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(POND.w, POND.d), new THREE.MeshLambertMaterial({ color: 0x3c9bb0 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(POND.x, 0.07, POND.z);
    scene.add(water);
}

function buildMarket() {
    const cloth = [0xc0392b, 0x2f7fa6, 0xd4a017, 0x5a7d52];
    STALLS.forEach((s, i) => {
        block(s.x, 1.5, s.z, 8, 3, 5, 0x8a5a2b);
        block(s.x, 4.3, s.z, 9, 0.4, 6, cloth[i % cloth.length]);
        for (const dx of [-3.8, 3.8]) for (const dz of [-2.3, 2.3]) block(s.x + dx, 2.2, s.z + dz, 0.25, 4.4, 0.25, 0x5e3f1f);
        for (let k = 0; k < 4; k++) {
            const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), lam([0xe67e22, 0xf1c40f, 0x8e44ad][k % 3]));
            fruit.position.set(s.x - 2 + k, 3.2, s.z + 2.6);
            scene.add(fruit);
        }
    });
}

function buildHouses() {
    for (const h of HOUSES) {
        block(h.x, h.h / 2, h.z, h.w, h.h, h.d, h.white ? 0xf2ead8 : 0xc08e5c);
        block(h.x, h.h + 0.25, h.z, h.w + 0.8, 0.5, h.d + 0.8, 0xa7764a);
        block(h.x - 2.5, 1.5, h.z + h.d / 2 + 0.05, 2, 3, 0.2, 0x3a2414); // door
        block(h.x + 2.5, 4.2, h.z + h.d / 2 + 0.05, 1.5, 1.2, 0.2, 0x2a3a4a); // window
    }
}

function buildFields() {
    for (const f of FIELDS) {
        const soil = new THREE.Mesh(new THREE.PlaneGeometry(f.w, f.d), lam(0x6b4a2b));
        soil.rotation.x = -Math.PI / 2;
        soil.position.set(f.x, 0.04, f.z);
        soil.receiveShadow = true;
        scene.add(soil);

        const rows = [];
        for (let z = f.z - f.d / 2 + 1.5; z < f.z + f.d / 2 - 1; z += 2.5) {
            for (let x = f.x - f.w / 2 + 1.5; x < f.x + f.w / 2 - 1; x += 1.2) rows.push([x, z]);
        }
        const plants = new THREE.InstancedMesh(new THREE.ConeGeometry(0.22, 0.9, 4), lam(0x7aa33a), rows.length);
        const d = new THREE.Object3D();
        rows.forEach(([x, z], i) => {
            d.position.set(x, 0.45, z);
            d.rotation.set(0, rand() * 3, 0);
            d.updateMatrix();
            plants.setMatrixAt(i, d.matrix);
        });
        scene.add(shadow(plants));
    }
}

function buildWell() {
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 1.1, 14), lam(0xd6c7a4));
    stone.position.set(WELL.x, 0.55, WELL.z);
    scene.add(shadow(stone));
    const dark = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.1, 12), lam(0x1d3b4a));
    dark.position.set(WELL.x, 1.12, WELL.z);
    scene.add(dark);
    // The shaduf: two posts, a beam, and a bucket on a rope.
    for (const dz of [-1.2, 1.2]) block(WELL.x - 1.8, 3, WELL.z + dz, 0.3, 6, 0.3, 0x6b4520);
    const beam = block(WELL.x + 0.2, 5.6, WELL.z, 0.3, 0.3, 7.5, 0x6b4520);
    beam.rotation.x = 0;
    block(WELL.x + 3.6, 2.8, WELL.z, 0.9, 0.9, 0.9, 0x7a5a3a);
}

function palm(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const h = 7 + rand() * 3;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, h, 6), lam(0x8a6a3d));
    trunk.position.y = h / 2;
    g.add(shadow(trunk));
    for (let i = 0; i < 7; i++) {
        const piv = new THREE.Group();
        piv.position.y = h;
        piv.rotation.y = (i / 7) * Math.PI * 2 + rand() * 0.4;
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 3.2), lam(0x4f8a2f));
        leaf.position.z = 1.5;
        leaf.rotation.x = 0.45;
        leaf.castShadow = true;
        piv.add(leaf);
        g.add(piv);
    }
    scene.add(g);
}

function acacia(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 3.2, 6), lam(0x6b4a2b));
    trunk.position.y = 1.6;
    g.add(shadow(trunk));
    const crown = new THREE.Mesh(new THREE.SphereGeometry(2.6, 10, 8), lam(0x5f8f3a));
    crown.scale.set(1.3, 0.45, 1.1);
    crown.position.y = 3.6;
    g.add(shadow(crown));
    scene.add(g);
}

// Trees and bushes on open ground only. Each tree needs room around it.
function buildGreenery() {
    let placed = 0;
    let tries = 0;
    while (placed < 70 && tries++ < 5000) {
        const x = (rand() - 0.5) * (MAP.half * 2 - 20);
        const z = (rand() - 0.5) * (MAP.half * 2 - 20);
        if (!isFree(x, z, 3.5)) continue;
        // Keep the spawn and the gates clear.
        if (Math.hypot(x - MAP.spawn.x, z - MAP.spawn.z) < 15) continue;
        const nearWater = Math.abs(z - (RIVER.z0 + RIVER.z1) / 2) < 12;
        if (nearWater || rand() < 0.5) palm(x, z);
        else acacia(x, z);
        placed++;
    }
    // Small bushes in the sand, to break up the flat ground.
    for (let i = 0; i < 180; i++) {
        const x = (rand() - 0.5) * (MAP.half * 2 - 20);
        const z = (rand() - 0.5) * (MAP.half * 2 - 20);
        if (!isFree(x, z, 1)) continue;
        const b = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 5), lam(0x6f8f3c));
        b.position.set(x, 0.45, z);
        scene.add(b);
    }
}

function buildLandmarkLabels() {
    const sprites = {};
    for (const l of LANDMARKS) {
        const s = label(l.name, { color: '#ffd34d', width: 9 });
        s.position.set(l.x, 16, l.z);
        s.visible = false;
        scene.add(s);
        sprites[l.id] = s;
    }
    return sprites;
}

// ---------- people

const FACTION_LOOK = {
    egypt: { robe: 0xf4efe0, trim: 0xd4a017, skin: 0x9b6a3c, headgear: 'nemes', band: 0x2a5db0 },
    hebrew: { robe: 0x8c5e3c, trim: 0x3b6fa0, skin: 0xb07a52, headgear: 'band', band: 0xf2e6cc },
};

function makeHuman({ robe, sash = 0x3b6fa0, skin = 0xb07a52, headgear = 'none', band = 0x2a5db0, hair = 0x1d1410 }) {
    const g = new THREE.Group();
    const add = (geo, color, x, y, z, parent = g) => {
        const m = new THREE.Mesh(geo, lam(color));
        m.position.set(x, y, z);
        m.castShadow = true;
        parent.add(m);
        return m;
    };
    add(new THREE.CylinderGeometry(0.3, 0.38, 0.85, 8), robe, 0, 1.25, 0);
    add(new THREE.BoxGeometry(0.66, 0.1, 0.46), sash, 0, 1.0, 0);
    add(new THREE.SphereGeometry(0.24, 12, 10), skin, 0, 2.0, 0);
    add(new THREE.BoxGeometry(0.1, 0.12, 0.12), skin, 0, 1.95, 0.23);
    add(new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair, 0, 2.05, -0.02);
    if (headgear === 'nemes') {
        add(new THREE.BoxGeometry(0.54, 0.22, 0.54), band, 0, 2.22, 0);
        for (const x of [-0.3, 0.3]) add(new THREE.BoxGeometry(0.12, 0.42, 0.5), 0xd4a017, x, 2.0, 0);
    } else if (headgear === 'band') {
        add(new THREE.BoxGeometry(0.52, 0.08, 0.52), band, 0, 2.2, 0);
    }
    const legs = [-0.14, 0.14].map((x) => {
        const piv = new THREE.Group();
        piv.position.set(x, 0.85, 0);
        g.add(piv);
        add(new THREE.CylinderGeometry(0.1, 0.09, 0.85, 6), skin, 0, -0.42, 0, piv);
        add(new THREE.BoxGeometry(0.16, 0.1, 0.26), 0x3a2a1a, 0, -0.86, 0.04, piv);
        return piv;
    });
    const arms = [-0.4, 0.4].map((x) => {
        const piv = new THREE.Group();
        piv.position.set(x, 1.55, 0);
        g.add(piv);
        add(new THREE.CylinderGeometry(0.09, 0.08, 0.75, 6), robe, 0, -0.38, 0, piv);
        add(new THREE.SphereGeometry(0.1, 8, 6), skin, 0, -0.78, 0, piv);
        return piv;
    });
    scene.add(g);
    return { group: g, legs, arms, x: 0, z: 0, face: 0 };
}

// Swings the legs and arms; amount 0 is standing still.
function pose(h, phase, amount) {
    const s = Math.sin(phase) * 0.6 * amount;
    h.legs[0].rotation.x = s;
    h.legs[1].rotation.x = -s;
    h.arms[0].rotation.x = -s * 0.6;
    h.arms[1].rotation.x = s * 0.6;
}

function placeHuman(h, x, z, face) {
    h.x = x;
    h.z = z;
    h.group.position.set(x, 0, z);
    h.face = face;
    h.group.rotation.y = face;
}

function turnTowards(h, target, dt) {
    let diff = target - h.face;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    h.face += diff * Math.min(1, dt * 10);
    h.group.rotation.y = h.face;
}

const npcs = NPCS.map((n) => {
    const h = makeHuman({ robe: n.robe, headgear: n.headgear, band: 0x2a5db0 });
    placeHuman(h, n.x, n.z, 0);
    const tag = label(n.name);
    tag.position.set(0, 2.9, 0);
    h.group.add(tag);
    return { def: n, h };
});

const villagers = VILLAGERS.map((v) => {
    const h = makeHuman({ robe: v.robe, headgear: rand() < 0.5 ? 'band' : 'none', band: 0xe8e0c8, skin: rand() < 0.5 ? 0xb07a52 : 0x8a5a34 });
    placeHuman(h, v.x, v.z, 0);
    return { home: v, h, tx: v.x, tz: v.z, wait: rand() * 3 };
});

const pickupMarks = PICKUPS.map((p) => {
    const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.2, 1.5, 24),
        new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(p.x, 0.15, p.z);
    scene.add(ring);
    const tag = label(p.label, { color: '#ffd34d', width: 2.2 });
    tag.position.set(p.x, 2.6, p.z);
    scene.add(tag);
    return { def: p, ring };
});

// ---------- build

buildGround();
buildRiver();
buildWalls();
buildPalace();
buildPyramids();
buildSphinx();
buildObelisk();
buildPond();
buildMarket();
buildHouses();
buildFields();
buildWell();
buildGreenery();
const landmarkSprites = buildLandmarkLabels();

// Palms by the pond and the market, so they read as oases.
for (const [x, z] of [[POND.x - 17, POND.z + 6], [POND.x + 17, POND.z - 6], [POND.x + 15, POND.z + 12]]) palm(x, z);
for (const [x, z] of [[80, 120], [110, 120]]) palm(x, z);

// ---------- game state

const state = {
    started: false,
    faction: null,
    run: null,
    player: null,
    px: MAP.spawn.x,
    pz: MAP.spawn.z,
    face: 0,
    speed: 0,
    camYaw: 0,
    camPitch: 0.5,
    camDist: 15,
    dragging: false,
    lastX: 0,
    lastY: 0,
    prompt: null,
    mapTimer: 0,
};
const keys = new Set();

// ---------- HUD

const $ = (id) => document.getElementById(id);
const intro = $('intro');
const hud = $('hud');
const prompt = $('prompt');
const toasts = $('toasts');
const minimap = $('minimap');
const mctx = minimap.getContext('2d');

const ITEM_LABEL = Object.fromEntries(PICKUPS.map((p) => [p.item, p.label]));

function toast(text, kind = '') {
    const d = document.createElement('div');
    d.className = `toast ${kind}`;
    d.textContent = text;
    toasts.prepend(d);
    setTimeout(() => d.remove(), 4200);
    while (toasts.children.length > 4) toasts.lastElementChild.remove();
}

function renderHud() {
    const run = state.run;
    if (!run) return;
    const quest = QUESTS[run.faction];
    const step = currentStep(run);
    $('hud-faction').textContent = run.faction === 'egypt' ? 'מצרי' : 'עברי';
    $('hud-quest').textContent = quest.title;
    $('hud-step').textContent = run.done ? 'המסע הושלם' : step.text;
    const p = progressOf(run, step);
    $('hud-progress').textContent = p ? `${p.have} / ${p.need}` : '';
    $('hud-score').textContent = run.score;
    $('hud-found').textContent = `${run.visited.length} / ${LANDMARKS.length}`;

    const pack = Object.entries(run.inventory).map(([k, n]) => `${ITEM_LABEL[k]}: ${n}`);
    $('hud-pack').textContent = pack.length ? pack.join('  ·  ') : 'התיק ריק';

    const list = $('hud-steps');
    list.replaceChildren(
        ...quest.steps.map((s, i) => {
            const li = document.createElement('li');
            const done = i < run.step;
            li.textContent = `${done ? '✓' : i === run.step ? '►' : '•'} ${s.text}`;
            if (done) li.className = 'done';
            if (i === run.step) li.className = 'now';
            return li;
        }),
    );
}

function send(event) {
    if (!state.run) return;
    const res = applyEvent(state.run, event);
    state.run = res.run;
    for (const m of res.messages) toast(m, res.run.done ? 'win' : '');
    if (event.type === 'visit' && res.messages.length) {
        const s = landmarkSprites[event.id];
        if (s) s.visible = true;
    }
    renderHud();
}

// ---------- start

function start(faction) {
    if (state.started) return;
    state.started = true;
    state.faction = faction;
    state.run = newRun(faction);
    state.player = makeHuman(FACTION_LOOK[faction]);
    state.player.group.traverse((o) => {
        if (o.isMesh) o.castShadow = true;
    });
    placeHuman(state.player, state.px, state.pz, 0);
    intro.hidden = true;
    hud.hidden = false;
    minimap.hidden = false;
    toast(QUESTS[faction].intro, 'intro');
    renderHud();
    // Landmarks reached before the start (none in practice) would still count.
    checkLandmarks();
}

// ---------- the frame

function checkLandmarks() {
    if (!state.run) return;
    for (const l of landmarksAt(state.px, state.pz)) {
        if (!state.run.visited.includes(l.id)) send({ type: 'visit', id: l.id, name: l.name });
    }
}

function nearbyTarget() {
    const npc = nearest(npcs.map((n) => ({ ...n.def, n })), state.px, state.pz, 4.5);
    const pickup = nearest(pickupMarks.map((p) => ({ ...p.def, p })), state.px, state.pz, 4.5);
    if (npc && (!pickup || Math.hypot(npc.x - state.px, npc.z - state.pz) <= Math.hypot(pickup.x - state.px, pickup.z - state.pz))) {
        return { kind: 'npc', item: npc.n, text: `E · דבר עם ${npc.name}` };
    }
    if (pickup) return { kind: 'pickup', item: pickup.p.def, text: `E · אסוף ${pickup.label}` };
    return null;
}

function interact() {
    if (!state.started || !state.run) return;
    const target = state.prompt;
    if (!target) return;
    if (target.kind === 'npc') {
        const def = target.item.def;
        toast(`${def.name}: "${def.say[state.faction]}"`);
        send({ type: 'talk', id: def.id });
    } else {
        const p = target.item;
        send({ type: 'pickup', id: p.id, item: p.item, label: p.label });
    }
}

function updatePlayer(dt) {
    const yaw = state.camYaw;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    const forward = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
    const side = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    let mx = fx * forward + rx * side;
    let mz = fz * forward + rz * side;
    const len = Math.hypot(mx, mz);
    const moving = len > 0;
    if (moving) {
        mx /= len;
        mz /= len;
        const speed = keys.has('shift') ? 13 : 7.5;
        const p = pushOut(state.px + mx * speed * dt, state.pz + mz * speed * dt, 0.5);
        state.px = p.x;
        state.pz = p.z;
        state.face = Math.atan2(mx, mz);
    }
    state.speed += ((moving ? 1 : 0) - state.speed) * Math.min(1, dt * 10);
    const h = state.player;
    h.x = state.px;
    h.z = state.pz;
    h.group.position.set(state.px, 0, state.pz);
    turnTowards(h, state.face, dt);
    pose(h, performance.now() / 1000 * 9, state.speed);
}

function updateVillagers(dt, t) {
    for (const v of villagers) {
        const dx = v.tx - v.h.x;
        const dz = v.tz - v.h.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.6) {
            v.wait -= dt;
            if (v.wait <= 0) {
                const a = rand() * Math.PI * 2;
                const r = Math.sqrt(rand()) * v.home.r;
                v.tx = v.home.x + Math.cos(a) * r;
                v.tz = v.home.z + Math.sin(a) * r;
                v.wait = 2 + rand() * 4;
            }
            pose(v.h, t, 0);
            continue;
        }
        const speed = 1.3;
        const p = pushOut(v.h.x + (dx / dist) * speed * dt, v.h.z + (dz / dist) * speed * dt, 0.4);
        v.h.x = p.x;
        v.h.z = p.z;
        v.h.group.position.set(p.x, 0, p.z);
        turnTowards(v.h, Math.atan2(dx, dz), dt);
        pose(v.h, t * 2 + v.home.x, 1);
    }
}

function updateCamera() {
    const target = { x: state.px, y: 1.6, z: state.pz };
    const cp = Math.cos(state.camPitch);
    camera.position.set(
        target.x + Math.sin(state.camYaw) * state.camDist * cp,
        target.y + Math.sin(state.camPitch) * state.camDist,
        target.z + Math.cos(state.camYaw) * state.camDist * cp,
    );
    camera.lookAt(target.x, target.y, target.z);
    sun.position.set(target.x + 60, 120, target.z + 40);
    sun.target.position.set(target.x, 0, target.z);
}

function updatePrompt() {
    if (!state.started) return;
    const t = nearbyTarget();
    state.prompt = t;
    if (t) {
        prompt.textContent = t.text;
        prompt.hidden = false;
    } else {
        prompt.hidden = true;
    }
}

function drawMinimap() {
    const size = minimap.width;
    const k = size / (MAP.half * 2);
    const X = (x) => (x + MAP.half) * k;
    const Z = (z) => (z + MAP.half) * k;
    mctx.fillStyle = '#e2c48c';
    mctx.fillRect(0, 0, size, size);
    mctx.fillStyle = '#2f86ad';
    for (const r of RIVER_RECTS) mctx.fillRect(X(r.x0), Z(r.z0), (r.x1 - r.x0) * k, (r.z1 - r.z0) * k);
    mctx.fillStyle = '#6b4a2b';
    for (const r of WALLS) mctx.fillRect(X(r.x0), Z(r.z0), Math.max(1, (r.x1 - r.x0) * k), Math.max(1, (r.z1 - r.z0) * k));
    mctx.font = 'bold 11px Heebo, Arial, sans-serif';
    mctx.textAlign = 'center';
    mctx.textBaseline = 'middle';
    for (const l of LANDMARKS) {
        const found = state.run?.visited.includes(l.id);
        mctx.beginPath();
        mctx.arc(X(l.x), Z(l.z), 4, 0, Math.PI * 2);
        mctx.fillStyle = found ? '#ffd34d' : 'rgba(255,255,255,0.7)';
        mctx.fill();
        mctx.strokeStyle = '#3a2414';
        mctx.lineWidth = 1;
        mctx.stroke();
    }
    mctx.fillStyle = '#3a2414';
    mctx.fillText('צ', size / 2, 8);
    // The player: a triangle that points the way the character faces.
    const px = X(state.px);
    const pz = Z(state.pz);
    mctx.save();
    mctx.translate(px, pz);
    mctx.rotate(state.face);
    mctx.beginPath();
    mctx.moveTo(0, -6);
    mctx.lineTo(4.5, 5);
    mctx.lineTo(-4.5, 5);
    mctx.closePath();
    mctx.fillStyle = '#d7263d';
    mctx.fill();
    mctx.restore();
}

function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}

// ---------- input

window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    keys.add(k);
    if (k === 'e' && !e.repeat && state.started) interact();
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

canvas.addEventListener('pointerdown', (e) => {
    state.dragging = true;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
    if (!state.dragging) return;
    state.camYaw -= (e.clientX - state.lastX) * 0.006;
    state.camPitch = Math.min(1.25, Math.max(0.15, state.camPitch + (e.clientY - state.lastY) * 0.004));
    state.lastX = e.clientX;
    state.lastY = e.clientY;
});
canvas.addEventListener('pointerup', () => (state.dragging = false));
canvas.addEventListener('pointercancel', () => (state.dragging = false));
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    state.camDist = Math.min(32, Math.max(6, state.camDist + e.deltaY * 0.012));
}, { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

for (const card of document.querySelectorAll('[data-faction]')) {
    card.addEventListener('click', () => start(card.dataset.faction));
}
$('restart').addEventListener('click', () => location.reload());

window.addEventListener('resize', resize);
resize();

// ---------- loop

let last = performance.now();
let clock = 0;
function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    if (state.started) {
        updatePlayer(dt);
        checkLandmarks();
        updatePrompt();
    }
    updateVillagers(dt, clock);
    for (const n of npcs) {
        if (state.started) {
            const dx = state.px - n.h.x;
            const dz = state.pz - n.h.z;
            if (Math.hypot(dx, dz) < 9) turnTowards(n.h, Math.atan2(dx, dz), dt);
        }
    }
    for (const p of pickupMarks) {
        p.ring.scale.setScalar(1 + Math.sin(clock * 3) * 0.08);
    }
    updateCamera();
    renderer.render(scene, camera);
    state.mapTimer += dt;
    if (state.mapTimer > 0.1) {
        state.mapTimer = 0;
        drawMinimap();
    }
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Read by the automated checks: where the player is and what the quest says.
window.__egypt = {
    get run() {
        return state.run;
    },
    get player() {
        return { x: state.px, z: state.pz };
    },
    teleport(x, z) {
        state.px = x;
        state.pz = z;
        checkLandmarks();
    },
    faction: start,
    factions: FACTIONS,
    progressOf,
};
document.body.dataset.ready = '1';
