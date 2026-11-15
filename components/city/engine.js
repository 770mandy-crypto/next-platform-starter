// The 3D side of the game: builds the city with three.js and runs the
// simulation loop. It knows nothing about React; the UI talks to it through the
// object returned by createGame and listens through the callbacks it passes in.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
    BLOCK, CELL, HALF, LINES, N, PAD_H, SEA_Z, SEABED, SPAWN, WALL, WATER_Y, FLOOR,
    generateWorld, groundAt, levelName, levelY, locate, locationOf, resolveSolids, rng, stepActor
} from './world.js';
import { CRATE_COLORS, WEAPONS, WEAPON_ORDER, rayWorld, shoot } from './combat.js';
import { createBots, hurtBot, updateBot } from './bots.js';
import { STAGES, addCash, applyEvent, initialProgress, loadProgress, saveProgress, stageView } from './progress.js';
import { clearWanted, createForce, escapeTime, hitOfficer, raiseWanted, reportGunfire, updateForce } from './police.js';
import { AMBIENT_LINES, CITIZENS } from './dialog.js';
import { instancedBoxes, makeBoat, makeCar, makeHeli, makeHuman, makeSafe, makeSign, setGun, swingHuman, waterNormals, windowTextures } from './models.js';

const SKY_KEYS = [
    [0, '#060b18'], [5, '#0b1426'], [6.5, '#e39a72'], [8, '#9ccbee'],
    [16.5, '#9ccbee'], [18.5, '#e88a5c'], [20, '#0d1730'], [24, '#060b18']
];
const WEATHER = {
    clear: { gray: '#9ccbee', mix: 0, dim: 1, near: 160, far: 900, rain: false, stars: 1, cloud: 0.5 },
    cloudy: { gray: '#8a949c', mix: 0.65, dim: 0.5, near: 110, far: 600, rain: false, stars: 0.15, cloud: 0.95 },
    rain: { gray: '#5f6a73', mix: 0.85, dim: 0.32, near: 30, far: 260, rain: true, stars: 0, cloud: 0.9 },
    fog: { gray: '#aab3b8', mix: 0.9, dim: 0.45, near: 6, far: 95, rain: false, stars: 0, cloud: 0 }
};
const SHIRTS = ['#c4553f', '#3f6fa8', '#d9b44a', '#4f8a5b', '#8a5aa8', '#d97b3a', '#3e8f9a', '#b34a6b'];
const PANTS = ['#2f3b4c', '#4a4038', '#3b4a3f', '#55524c'];
const CAR_COLORS = ['#b8443a', '#e0c070', '#3d6f9e', '#e9e6dc', '#3f7f6a', '#2e3238'];
const CAR_TYPES = {
    basic: { label: 'מכונית', max: 27, accel: 15, turn: 1.9, armor: 0.5 },
    super: { label: 'מכונית על', max: 54, accel: 34, turn: 2.3, armor: 0.5 },
    sport: { label: 'מכונית ספורט', max: 43, accel: 25, turn: 2.1, armor: 0.5 },
    jeep: { label: 'ג׳יפ משוריין', max: 25, accel: 14, turn: 1.7, armor: 0.2 }
};
const BOAT_TYPES = {
    motor: { label: 'סירת מנוע', max: 16, accel: 8, turn: 1.2 },
    speed: { label: 'סירת מרוץ', max: 31, accel: 16, turn: 1.5 }
};
const BOT_COUNT = 8;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function angleLerp(a, b, t) {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
}
const stageOfReward = (type, id) => STAGES.findIndex((s) => s.reward.type === type && s.reward.id === id) + 1;

export function createGame(container, bubbleLayer, cb = {}) {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const world = generateWorld(11);
    const rand = rng(404);
    const storage = (() => { try { return window.localStorage; } catch { return null; } })();
    let progress = storage ? loadProgress(storage) : initialProgress();

    // --- renderer ------------------------------------------------------------
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const canvas = renderer.domElement;
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#9ccbee');
    scene.fog = new THREE.Fog('#9ccbee', 160, 900);
    const camera = new THREE.PerspectiveCamera(58, 1, 0.25, 2400);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.3;
    pmrem.dispose();

    let composer = null;
    if (!coarse) {
        try {
            const target = new THREE.WebGLRenderTarget(4, 4, { samples: 4, type: THREE.HalfFloatType });
            composer = new EffectComposer(renderer, target);
            composer.addPass(new RenderPass(scene, camera));
            composer.addPass(new UnrealBloomPass(new THREE.Vector2(4, 4), 0.35, 0.6, 1.6));
            composer.addPass(new OutputPass());
        } catch (err) {
            console.warn('Post-processing unavailable, rendering directly.', err);
            composer = null;
        }
    }

    const hemi = new THREE.HemisphereLight('#cfe4f5', '#5b5346', 1);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fff1d6', 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(coarse ? 1024 : 4096, coarse ? 1024 : 4096);
    Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 1, far: 420 });
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.06;
    scene.add(sun, sun.target);

    // --- ground, sea, streets ------------------------------------------------
    const std = (color, extra) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
    const plane = (w, d, material, x, y, z) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
        m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true;
        scene.add(m);
        return m;
    };
    plane(3200, 1600 + SEA_Z, std('#4f6d4b'), 0, -0.03, (SEA_Z - 1600) / 2);
    plane(HALF * 2 + 10, HALF * 2 + 10, std('#2a3036', { roughness: 0.82 }), 0, 0, 0);
    plane(3200, 14, std('#d9c9a0'), 0, -0.02, SEA_Z - 7);
    // The beach slopes from the promenade down to the sea bed.
    const slope = plane(3200, Math.hypot(12, SEABED), std('#d9c9a0'), 0, SEABED / 2, SEA_Z + 6);
    slope.rotation.x = -Math.PI / 2 + Math.atan2(-SEABED, 12);
    plane(3200, 1800, std('#b9a77c'), 0, SEABED, SEA_Z + 12 + 900);
    const ripples = waterNormals();
    ripples.repeat.set(160, 100);
    const water = plane(3200, 1800, new THREE.MeshPhysicalMaterial({
        color: '#1d6a86', roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.86,
        normalMap: ripples, normalScale: new THREE.Vector2(0.55, 0.55), envMapIntensity: 1.4
    }), 0, WATER_Y, SEA_Z + 2 + 900);
    water.receiveShadow = false;
    const pier = world.pier;
    scene.add(instancedBoxes([
        { x: 0, y: pier.top - 0.12, z: (pier.z0 + pier.z1) / 2, sx: pier.x1 - pier.x0, sy: 0.24, sz: pier.z1 - pier.z0, color: '#9a7b55' },
        ...Array.from({ length: 16 }, (_, k) => ({ x: k % 2 ? pier.x1 - 0.3 : pier.x0 + 0.3, y: -0.4, z: pier.z0 + 3 + Math.floor(k / 2) * 5.4, sx: 0.4, sy: 2, sz: 0.4, color: '#6b5238' }))
    ], std('#ffffff')));

    const padColor = { building: '#b9b4a8', hill: '#a9a08e', helipad: '#8f9499', park: '#5f8a52' };
    scene.add(instancedBoxes(world.blocks.map((b) => ({ x: b.cx, y: PAD_H / 2, z: b.cz, sx: BLOCK, sy: PAD_H, sz: BLOCK, color: padColor[b.type] })), std('#ffffff'), false));
    const dashes = [];
    for (const line of LINES) for (let d = -HALF + 3; d < HALF; d += 7) {
        dashes.push({ x: line, y: 0.01, z: d, sx: 0.22, sy: 0.02, sz: 3 });
        dashes.push({ x: d, y: 0.01, z: line, sx: 3, sy: 0.02, sz: 0.22 });
    }
    scene.add(instancedBoxes(dashes, std('#d8d2bd'), false));

    // --- buildings: facade shell, interior, floors, elevators, doors ---------
    const textures = [windowTextures(1), windowTextures(2), windowTextures(3)];
    const roofMat = std('#5b6166');
    const glowMats = [];
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const slabs = [], liftPads = [], shafts = [], doors = [], portals = [], inner = [];
    for (const b of world.buildings) {
        const t = textures[b.variant];
        const map = t.wall.clone(), glow = t.glow.clone();
        map.repeat.set(b.size / 24, b.floors / 8);
        glow.repeat.copy(map.repeat);
        map.needsUpdate = glow.needsUpdate = true;
        const side = new THREE.MeshStandardMaterial({ color: b.color, map, emissiveMap: glow, emissive: '#ffd9a0', emissiveIntensity: 0, roughness: 0.72, metalness: 0.05 });
        glowMats.push(side);
        const mesh = new THREE.Mesh(boxGeo, [side, side, roofMat, roofMat, side, side]);
        mesh.scale.set(b.size, b.h, b.size);
        mesh.position.set(b.cx, b.h / 2, b.cz);
        mesh.castShadow = mesh.receiveShadow = true;
        scene.add(mesh);
        inner.push({ x: b.cx, y: b.h / 2, z: b.cz, sx: b.size - WALL * 2, sy: b.h - 0.02, sz: b.size - WALL * 2, color: b.variant === 0 ? '#d6cfc1' : b.variant === 1 ? '#c5ced0' : '#d2c7b3' });
        for (let k = 1; k < b.floors; k++) slabs.push({ x: b.cx, y: k * FLOOR - 0.125, z: b.cz, sx: b.size - WALL * 2 - 0.02, sy: 0.25, sz: b.size - WALL * 2 - 0.02 });
        for (let k = 0; k <= b.floors; k++) liftPads.push({ x: b.lift.x, y: levelY(b, k) + 0.03, z: b.lift.z, sx: 2.2, sy: 0.05, sz: 2.2 });
        shafts.push({ x: b.lift.x, y: b.h / 2, z: b.lift.z, sx: 2.3, sy: b.h, sz: 2.3 });
        const d = b.door, z = b.z1 + 0.04;
        portals.push({ x: d.x, y: PAD_H + d.h / 2, z, sx: d.half * 2, sy: d.h, sz: 0.1 });
        doors.push({ x: d.x - d.half - 0.1, y: PAD_H + d.h / 2, z, sx: 0.2, sy: d.h + 0.2, sz: 0.2 });
        doors.push({ x: d.x + d.half + 0.1, y: PAD_H + d.h / 2, z, sx: 0.2, sy: d.h + 0.2, sz: 0.2 });
        doors.push({ x: d.x, y: PAD_H + d.h + 0.2, z, sx: d.half * 2 + 0.6, sy: 0.3, sz: 0.5 });
    }
    const gold = new THREE.MeshStandardMaterial({ color: '#dfc184', metalness: 0.75, roughness: 0.3, emissive: '#dfc184', emissiveIntensity: 0.25 });
    scene.add(instancedBoxes(inner, new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.BackSide, roughness: 0.9, emissive: '#6f695d', emissiveIntensity: 0.6 }), false));
    scene.add(instancedBoxes(slabs, std('#c9c4b8', { emissive: '#5a554c', emissiveIntensity: 0.6 }), false));
    scene.add(instancedBoxes(liftPads, gold, false));
    scene.add(instancedBoxes(doors, gold));
    scene.add(instancedBoxes(portals, std('#0c1820', { emissive: '#3a2c14', emissiveIntensity: 0.8, roughness: 0.3 }), false));
    const shaftMesh = instancedBoxes(shafts, new THREE.MeshBasicMaterial({ color: '#dfc184', transparent: true, opacity: 0.1, depthWrite: false }), false);
    shaftMesh.receiveShadow = false;
    scene.add(shaftMesh);
    if (world.stepBoxes.length) scene.add(instancedBoxes(world.stepBoxes, std('#9aa3a6', { metalness: 0.3, roughness: 0.6 })));
    scene.add(instancedBoxes(world.hillBoxes, std('#ffffff')));

    // Pickups: one crate per floor, hidden while waiting to respawn.
    const crateMesh = instancedBoxes(world.pickups.map((p) => ({ x: p.x, y: p.y + 0.3, z: p.z, sx: 0.75, sy: 0.55, sz: 0.75, color: CRATE_COLORS[p.kind] })), std('#ffffff', { roughness: 0.5, metalness: 0.2 }), false);
    scene.add(crateMesh);
    const crateReady = new Float64Array(world.pickups.length);
    const cratesOf = world.buildings.map(() => []);
    for (const p of world.pickups) cratesOf[p.building].push(p);
    const mTmp = new THREE.Matrix4();
    const showCrate = (p, on) => {
        mTmp.makeScale(on ? 0.75 : 0, on ? 0.55 : 0, on ? 0.75 : 0).setPosition(p.x, p.y + 0.3, p.z);
        crateMesh.setMatrixAt(p.id, mTmp);
        crateMesh.instanceMatrix.needsUpdate = true;
    };

    // Golden beacon on the summit of the stepped hill.
    const hill = world.blocks.find((b) => b.type === 'hill');
    const beaconMat = new THREE.MeshStandardMaterial({ color: '#dfc184', emissive: '#dfc184', emissiveIntensity: 0.4, metalness: 0.6, roughness: 0.3 });
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), beaconMat);
    beacon.position.set(hill.cx, hill.top + 2.6, hill.cz);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 2, 8), std('#3b4348'));
    pole.position.set(hill.cx, hill.top + 1, hill.cz);
    scene.add(beacon, pole);

    const pad = world.blocks.find((b) => b.type === 'helipad');
    const ring = new THREE.Mesh(new THREE.RingGeometry(5.2, 5.8, 64), new THREE.MeshBasicMaterial({ color: '#dfc184' }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(pad.cx, PAD_H + 0.02, pad.cz);
    scene.add(ring);

    {
        const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.26, 2.2, 8), std('#6b4f3a'), world.trees.length);
        const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.7, 2), std('#4d7d48', { roughness: 0.95 }), world.trees.length * 2);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
        world.trees.forEach((t, n) => {
            m.compose(new THREE.Vector3(t.x, PAD_H + 1.1 * t.s, t.z), q, new THREE.Vector3(t.s, t.s, t.s));
            trunks.setMatrixAt(n, m);
            m.compose(new THREE.Vector3(t.x, PAD_H + 3.2 * t.s, t.z), q, new THREE.Vector3(t.s, t.s * 1.1, t.s));
            crowns.setMatrixAt(n * 2, m);
            crowns.setColorAt(n * 2, c.setHSL(0.3 + rand() * 0.06, 0.34, 0.28 + rand() * 0.1));
            m.compose(new THREE.Vector3(t.x + 0.5 * t.s, PAD_H + 4.3 * t.s, t.z - 0.3 * t.s), q, new THREE.Vector3(t.s * 0.62, t.s * 0.62, t.s * 0.62));
            crowns.setMatrixAt(n * 2 + 1, m);
            crowns.setColorAt(n * 2 + 1, c.setHSL(0.29 + rand() * 0.06, 0.36, 0.33 + rand() * 0.1));
        });
        trunks.castShadow = crowns.castShadow = true;
        scene.add(trunks, crowns);
    }
    const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff1cf', emissive: '#ffd58a', emissiveIntensity: 0 });
    {
        const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.09, 4.2, 8), std('#39424a', { metalness: 0.6, roughness: 0.4 }), world.lamps.length);
        const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.24, 12, 10), bulbMat, world.lamps.length);
        const m = new THREE.Matrix4();
        world.lamps.forEach((l, n) => {
            poles.setMatrixAt(n, m.makeTranslation(l.x, PAD_H + 2.1, l.z));
            bulbs.setMatrixAt(n, m.makeTranslation(l.x, PAD_H + 4.3, l.z));
        });
        scene.add(poles, bulbs);
    }

    // --- sky -----------------------------------------------------------------
    const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } },
        vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vDir; void main(){ float h = clamp(vDir.y, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.5)), 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), skyMat);
    sky.renderOrder = -10;
    const starPos = new Float32Array(900 * 3);
    for (let n = 0; n < 900; n++) {
        const a = rand() * Math.PI * 2, e = Math.asin(rand() * 0.95 + 0.05);
        starPos.set([Math.cos(a) * Math.cos(e) * 1700, Math.sin(e) * 1700, Math.sin(a) * Math.cos(e) * 1700], n * 3);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    const orb = new THREE.Mesh(new THREE.SphereGeometry(42, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff3d0', fog: false }));
    const cloudMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, fog: false, depthWrite: false });
    const clouds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), cloudMat, 60);
    const cloudSeeds = Array.from({ length: 20 }, () => ({ x: (rand() - 0.5) * 2400, y: 260 + rand() * 120, z: (rand() - 0.5) * 2400, s: 50 + rand() * 60 }));
    clouds.frustumCulled = false;
    scene.add(sky, stars, orb, clouds);

    const RAIN = 1600;
    const rainPos = new Float32Array(RAIN * 6);
    const rainSeed = new Float32Array(RAIN * 3);
    for (let n = 0; n < RAIN; n++) rainSeed.set([(rand() - 0.5) * 70, rand() * 45, (rand() - 0.5) * 70], n * 3);
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#b9cbd6', transparent: true, opacity: 0.55 }));
    rain.frustumCulled = false; rain.visible = false;
    scene.add(rain);

    // --- effects: tracers and impact sparks ----------------------------------
    const tracerGeo = new THREE.BoxGeometry(0.035, 0.035, 1);
    const tracers = Array.from({ length: 48 }, () => {
        const m = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color: '#ffe9ad', transparent: true, toneMapped: false }));
        m.visible = false; m.userData.life = 0;
        scene.add(m);
        return m;
    });
    const sparkGeo = new THREE.SphereGeometry(0.09, 8, 6);
    const sparks = Array.from({ length: 24 }, () => {
        const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, toneMapped: false }));
        m.visible = false; m.userData.life = 0;
        scene.add(m);
        return m;
    });
    let tracerNext = 0, sparkNext = 0;
    const va = new THREE.Vector3(), vb = new THREE.Vector3(), v3 = new THREE.Vector3();
    function drawShot(from, end, hitActor) {
        const t = tracers[tracerNext++ % tracers.length];
        va.set(from[0], from[1], from[2]); vb.set(end[0], end[1], end[2]);
        t.position.copy(va).add(vb).multiplyScalar(0.5);
        t.scale.set(1, 1, Math.max(0.1, va.distanceTo(vb)));
        t.lookAt(vb);
        t.material.opacity = 0.9; t.userData.life = 0.07; t.visible = true;
        const s = sparks[sparkNext++ % sparks.length];
        s.position.copy(vb);
        s.material.color.set(hitActor ? '#ff5a4a' : '#ffd27a');
        s.material.opacity = 1; s.userData.life = 0.16; s.scale.setScalar(hitActor ? 1.6 : 1); s.visible = true;
    }

    // --- actors --------------------------------------------------------------
    const player = {
        ...SPAWN, vy: 0, grounded: true, heading: Math.PI, phase: 0, hp: 100, dead: false, deadT: 0,
        weapon: 'pistol', mags: {}, reserve: {}, cooldown: 0, reloading: 0, lastShot: -9, lastHurt: -9, speed: 0,
        mesh: makeHuman({ shirt: '#dfc184', pants: '#22303c' })
    };
    for (const id of WEAPON_ORDER) { player.mags[id] = WEAPONS[id].mag; player.reserve[id] = WEAPONS[id].mag * 3; }
    setGun(player.mesh, player.weapon);
    scene.add(player.mesh);

    const vehicles = [];
    const addVehicle = (kind, type, x, z, yaw, color) => {
        const mesh = kind === 'car' ? makeCar(type, color) : makeBoat(type, color);
        scene.add(mesh);
        const v = { kind, type, x, z, yaw, speed: 0, mesh, spec: (kind === 'car' ? CAR_TYPES : BOAT_TYPES)[type], home: { x, z, yaw }, phase: rand() * 6 };
        vehicles.push(v);
        return v;
    };
    [[7, 24.5, Math.PI / 2], [LINES[4] + 2.5, -30, 0], [LINES[2] - 2.5, 60, Math.PI], [-60, LINES[5] + 2.5, -Math.PI / 2], [80, LINES[2] - 2.5, Math.PI / 2], [LINES[6] + 2.5, 100, 0]]
        .forEach(([x, z, yaw], n) => addVehicle('car', 'basic', x, z, yaw, CAR_COLORS[n]));
    addVehicle('car', 'sport', -7, 24.5, -Math.PI / 2, '#d8a21c');
    addVehicle('car', 'sport', LINES[5] - 2.5, -70, Math.PI, '#c2281e');
    addVehicle('car', 'jeep', 30, LINES[4] + 2.5, Math.PI / 2, '#4b5a44');
    addVehicle('car', 'jeep', LINES[1] + 2.5, -20, 0, '#3b4148');
    addVehicle('car', 'super', LINES[4] - 2.5, 34, Math.PI, '#1c1f24');
    addVehicle('boat', 'motor', 5.6, SEA_Z + 20, 0, '#e9e3d6');
    addVehicle('boat', 'motor', -5.6, SEA_Z + 20, 0, '#3d6f9e');
    addVehicle('boat', 'speed', 5.6, SEA_Z + 33, 0, '#b8281e');
    const isUnlocked = (v) => v.type === 'basic' || (v.kind === 'car' ? progress.cars : progress.boats).includes(v.type);

    const heli = { kind: 'heli', x: pad.cx, y: PAD_H, z: pad.cz, yaw: 0, vy: 0, spin: 0, mesh: makeHeli() };
    scene.add(heli.mesh);

    // Opponents: each has a body, a weapon and a health bar that faces the camera.
    let bots = [];
    let botsOn = false;
    const botViews = Array.from({ length: BOT_COUNT }, () => {
        const mesh = makeHuman({ shirt: '#3a3f46', pants: '#23262b', hair: '#111214', vest: '#8f2a22' });
        const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.09), new THREE.MeshBasicMaterial({ color: '#ff5a4a', fog: false, toneMapped: false }));
        bar.position.y = 2.1;
        mesh.add(bar);
        mesh.visible = false;
        scene.add(mesh);
        return { mesh, bar, weapon: null, phase: 0 };
    });

    // Businesses: a sign over the door, a counter, shelves and the safe.
    const safes = world.businesses.map((biz) => {
        const b = world.buildings[biz.building];
        const sign = makeSign(biz.name, biz.color);
        sign.position.set(b.door.x, PAD_H + b.door.h + 1.25, b.z1 + 0.06);
        scene.add(sign);
        const safe = makeSafe();
        safe.position.set(biz.safe.x, PAD_H, biz.safe.z);
        safe.rotation.y = Math.atan2(b.cx - biz.safe.x, b.cz - biz.safe.z);
        scene.add(safe);
        return { biz, safe, robbedUntil: 0 };
    });
    {
        const decor = [];
        for (const biz of world.businesses) {
            const b = world.buildings[biz.building];
            decor.push({ x: b.cx + 1.5, y: PAD_H + 0.55, z: b.z1 - 4.2, sx: 4.2, sy: 1.1, sz: 0.8, color: biz.color });
            decor.push({ x: b.cx + 1.5, y: PAD_H + 1.13, z: b.z1 - 4.2, sx: 4.3, sy: 0.06, sz: 0.9, color: '#d8d2c6' });
            for (let n = 0; n < 3; n++) decor.push({ x: b.x1 - 0.45, y: PAD_H + 1.1, z: b.cz + 1 + n * 2.4, sx: 0.5, sy: 2.2, sz: 2, color: '#6b5238' });
        }
        scene.add(instancedBoxes(decor, std('#ffffff', { roughness: 0.6 })));
    }

    // The police: officers on foot and patrol or chase cars with light bars.
    let force = createForce();
    let policeOn = true;
    const officerViews = Array.from({ length: 12 }, () => {
        const mesh = makeHuman({ shirt: '#2c4a7a', pants: '#1a2233', vest: '#1b2a3f', hat: '#16233a', hair: '#1b1b1f' });
        mesh.visible = false;
        scene.add(mesh);
        return { mesh, weapon: null, phase: 0 };
    });
    const policeCarViews = Array.from({ length: 8 }, () => {
        const mesh = makeCar('police', '#f1f1ee');
        mesh.visible = false;
        scene.add(mesh);
        return mesh;
    });
    let heist = null;

    const walkBlocks = world.blocks.filter((b) => b.type !== 'hill');
    const citizens = CITIZENS.map((info, n) => {
        const block = n < 4
            ? walkBlocks.filter((b) => Math.abs(b.cx) <= CELL && Math.abs(b.cz) <= CELL)[(n * 2) % 8]
            : walkBlocks[Math.floor(rand() * walkBlocks.length)];
        const mesh = makeHuman({ shirt: SHIRTS[n % SHIRTS.length], pants: PANTS[n % PANTS.length], hair: ['#2a1f18', '#5a3d25', '#1b1b1f', '#8a6a3d'][n % 4], skinTone: ['#e2b594', '#c99673', '#f0c9a8', '#a9764f'][n % 4] });
        scene.add(mesh);
        const bubble = document.createElement('div');
        bubble.className = 'citizen-world-bubble';
        bubble.style.display = 'none';
        bubbleLayer.appendChild(bubble);
        return { id: n, ...info, block, p: rand() * 124, dir: rand() < 0.5 ? 1 : -1, speed: 1.2 + rand() * 0.9, pause: 0, phase: rand() * 6, mesh, bubble, bubbleTime: 0, x: 0, z: 0 };
    });

    // --- state ---------------------------------------------------------------
    const keys = new Set();
    const input = { mx: 0, my: 0, jump: false, down: false, fire: false };
    const cam = { yaw: 0.6, pitch: 0.42, dist: 9, tx: 0, ty: 6, tz: 0, lastDrag: -10, actual: 9 };
    const env = { hour: 10, weather: 'clear', cycle: true };
    let started = false, mode = 'foot', vehicle = null, lift = null, chattingId = null, disposed = false;
    let promptTarget = null, lastPrompt, lastLocation, lastHud = '', lastHourSent = -1, lastStatus = '', lastStage = '';
    let clock = 0, slowTick = 0, bubbleTick = 3, raf = 0, last = performance.now();
    let paused = false, fireLatch = false, noise = null, travelled = 0, lastLocKey = '', onSummit = false, dirty = false, saveTick = 0, locked = false;
    const tmpColor = new THREE.Color(), grayColor = new THREE.Color(), topColor = new THREE.Color();
    const target = { x: 0, y: 0, z: 0, dead: false, speed: 0 };

    const toast = (text) => cb.onToast?.(text);
    function emit(event, value = 1) {
        const r = applyEvent(progress, event, value, botsOn);
        if (r.state !== progress) { progress = r.state; dirty = true; }
        if (r.completed) {
            const reward = r.completed.reward;
            if (reward.type === 'weapon') player.reserve[reward.id] = Math.max(player.reserve[reward.id], WEAPONS[reward.id].mag * 3);
            toast(`שלב ${progress.stage} הושלם! קיבלתם: ${reward.label}`);
            if (storage) saveProgress(storage, progress);
        }
    }

    function placeCitizen(c) {
        const side = Math.floor(c.p / 31) % 4, u = c.p % 31, e = 15.5;
        const [lx, lz, hx, hz] = side === 0 ? [-e + u, -e, 1, 0] : side === 1 ? [e, -e + u, 0, 1] : side === 2 ? [e - u, e, -1, 0] : [-e, e - u, 0, -1];
        c.x = c.block.cx + lx; c.z = c.block.cz + lz;
        c.mesh.position.set(c.x, PAD_H, c.z);
        if (chattingId !== c.id) c.mesh.rotation.y = Math.atan2(hx * c.dir, hz * c.dir);
    }

    function nearest() {
        if (mode !== 'foot' || player.dead) return null;
        const loc = locationOf(world, player.x, player.y, player.z);
        if (loc.b && Math.hypot(player.x - loc.b.lift.x, player.z - loc.b.lift.z) < 1.5) {
            return { type: 'lift', ref: loc.b, level: loc.level, text: `מעלית · ${levelName(loc.b, loc.level)}` };
        }
        if (loc.b && loc.level === 0 && loc.b.business !== null) {
            const s0 = safes[loc.b.business];
            if (Math.hypot(player.x - s0.biz.safe.x, player.z - s0.biz.safe.z) < 1.9) {
                if (s0.robbedUntil > clock) return { type: 'emptySafe', ref: s0, text: `הכספת ריקה · מתמלאת שוב בעוד ${Math.ceil(s0.robbedUntil - clock)} שניות` };
                if (heist) return { type: 'cracking', ref: s0, text: `פורצים… ${Math.floor((heist.t / heist.need) * 100)}%` };
                return { type: 'safe', ref: s0, text: `פריצת הכספת · ${s0.biz.name}` };
            }
        }
        let best = null, bd = Infinity;
        const consider = (t, x, z, max, y = 0) => {
            const d = Math.hypot(player.x - x, player.z - z);
            if (d < max && d < bd && Math.abs(player.y - y) < 2.5) { bd = d; best = t; }
        };
        for (const v of vehicles) {
            const open = isUnlocked(v);
            const text = open ? (v.kind === 'car' ? `כניסה ל${v.spec.label}` : `עלייה ל${v.spec.label}`) : `${v.spec.label} · נעול עד שלב ${stageOfReward(v.kind, v.type)}`;
            consider({ type: open ? v.kind : 'locked', ref: v, text }, v.x, v.z, v.kind === 'car' ? 4 : 6.5, v.kind === 'car' ? 0 : WATER_Y);
        }
        consider({ type: 'heli', ref: heli, text: 'עלייה למסוק' }, heli.x, heli.z, 5, heli.y);
        for (const c of citizens) consider({ type: 'citizen', ref: c, text: `שיחה עם ${c.name}` }, c.x, c.z, 3, PAD_H);
        return best;
    }

    function leaveVehicle() {
        const v = vehicle;
        if (mode === 'car') {
            const out = resolveSolids(world, v.x - Math.cos(v.yaw) * 2.4, v.z + Math.sin(v.yaw) * 2.4, 0, 0.4);
            Object.assign(player, { x: out.x, z: out.z, y: groundAt(world, out.x, out.z, 1), vy: 0 });
        } else if (mode === 'boat') {
            const nearPier = Math.abs(v.x) < 9.5 && v.z > pier.z0 && v.z < pier.z1 + 2;
            if (nearPier) Object.assign(player, { x: clamp(v.x, pier.x0 + 0.6, pier.x1 - 0.6), z: clamp(v.z, pier.z0 + 1, pier.z1 - 1), y: pier.top, vy: 0 });
            else Object.assign(player, { x: v.x - Math.cos(v.yaw) * 2, z: v.z + Math.sin(v.yaw) * 2, y: groundAt(world, v.x, v.z, 0), vy: 0 });
        } else if (mode === 'heli') {
            Object.assign(player, { x: heli.x - Math.cos(heli.yaw) * 2.6, z: heli.z + Math.sin(heli.yaw) * 2.6, y: heli.y, vy: 0 });
        }
        if (v) v.speed = 0;
        mode = 'foot'; vehicle = null; player.mesh.visible = true; player.grounded = false;
    }

    function interact() {
        if (!started || player.dead || mode === 'lift') return;
        if (mode === 'heli' && heli.y - groundAt(world, heli.x, heli.z, heli.y) > 0.4) return;
        if (mode !== 'foot') { leaveVehicle(); return; }
        const t = nearest();
        if (!t) return;
        if (t.type === 'citizen') { cb.onChat?.({ id: t.ref.id, name: t.ref.name, role: t.ref.role }); return; }
        if (t.type === 'lift') { cb.onElevator?.({ name: t.ref.name, floors: t.ref.floors, level: t.level }); return; }
        if (t.type === 'safe') { startHeist(t.ref); return; }
        if (t.type === 'emptySafe' || t.type === 'cracking') return;
        if (t.type === 'locked') { toast(`${t.ref.spec.label} נפתח בסיום שלב ${stageOfReward(t.ref.kind, t.ref.type)}`); return; }
        mode = t.type; vehicle = t.ref; player.mesh.visible = false;
    }

    function rideTo(level) {
        const loc = locationOf(world, player.x, player.y, player.z);
        if (mode !== 'foot' || !loc.b || Math.hypot(player.x - loc.b.lift.x, player.z - loc.b.lift.z) > 1.6) return false;
        const k = clamp(Math.round(level), 0, loc.b.floors);
        if (k === loc.level) return false;
        lift = { b: loc.b, y: levelY(loc.b, k), level: k };
        mode = 'lift';
        return true;
    }

    function setWeapon(id) {
        if (!WEAPONS[id] || !progress.weapons.includes(id) || id === player.weapon) return false;
        player.weapon = id; player.reloading = 0; player.cooldown = 0.25;
        setGun(player.mesh, id);
        report();
        return true;
    }
    function nextWeapon() {
        const owned = WEAPON_ORDER.filter((id) => progress.weapons.includes(id));
        setWeapon(owned[(owned.indexOf(player.weapon) + 1) % owned.length]);
    }
    function reload() {
        const w = WEAPONS[player.weapon];
        if (player.reloading > 0 || player.mags[w.id] >= w.mag || player.reserve[w.id] <= 0) return false;
        player.reloading = w.reload;
        return true;
    }

    function damagePlayer(amount) {
        if (player.dead || !started) return;
        const armor = mode === 'car' ? vehicle.spec.armor : mode === 'heli' || mode === 'boat' ? 0.6 : 1;
        player.hp -= amount * armor;
        player.lastHurt = clock;
        cb.onHurt?.();
        if (player.hp > 0) return;
        player.hp = 0; player.dead = true; player.deadT = 3.5;
        if (mode !== 'foot' && mode !== 'lift') leaveVehicle();
        mode = 'foot'; lift = null;
        heist = null;
        emit('death');
        const lost = Math.floor(progress.cash * 0.1);
        if (lost) { progress = addCash(progress, -lost); dirty = true; }
        clearWanted(force);
        toast(lost ? `נפלתם! איבדתם ${lost.toLocaleString('he-IL')} ₪` : 'נפלתם! חוזרים לנקודת ההתחלה…');
    }
    function respawn() {
        Object.assign(player, { ...SPAWN, vy: 0, grounded: true, hp: 100, dead: false, reloading: 0 });
        player.mesh.rotation.x = 0;
        for (const b of bots) { b.known = null; b.knownAt = -99; }
    }

    function arrested() {
        const lost = Math.floor(progress.cash * 0.3);
        progress = addCash(progress, -lost);
        emit('arrest');
        dirty = true;
        heist = null;
        if (mode !== 'foot' && mode !== 'lift') leaveVehicle();
        mode = 'foot'; lift = null;
        respawn();
        toast(lost ? `נעצרתם! המשטרה החרימה ${lost.toLocaleString('he-IL')} ₪` : 'נעצרתם! שוחררתם בערבות');
    }

    function startHeist(s0) {
        heist = { s: s0, t: 0, need: s0.biz.crack };
        if (policeOn) raiseWanted(force, 1);
        cb.onSound?.('alarm');
        toast(`האזעקה הופעלה ב${s0.biz.name}! פרצו מהר — המשטרה בדרך`);
    }
    function updateHeist(dt) {
        if (!heist) return;
        const s0 = heist.s;
        if (player.dead || Math.hypot(player.x - s0.biz.safe.x, player.z - s0.biz.safe.z) > 2.2 || player.y > 1.5) {
            heist = null;
            toast('הפריצה הופסקה');
            return;
        }
        heist.t += dt;
        s0.safe.userData.dial.rotation.y += dt * 9;
        if (heist.t < heist.need) return;
        const [lo, hi] = s0.biz.cash;
        const take = Math.round((lo + Math.random() * (hi - lo)) / 10) * 10;
        progress = addCash(progress, take);
        dirty = true;
        s0.robbedUntil = clock + 240;
        heist = null;
        if (policeOn) raiseWanted(force, s0.biz.heat);
        emit('heist');
        cb.onSound?.('cash');
        toast(`הכספת נפרצה! +${take.toLocaleString('he-IL')} ₪ — עכשיו ברחו!`);
    }

    function hitBot(bot, damage) {
        if (bot.police) {
            const killed = hitOfficer(force, bot, damage, clock, player);
            cb.onHit?.(killed);
            if (killed) toast('שוטר נפגע — רמת החיפוש עלתה!');
            return;
        }
        if (hurtBot(bot, damage, clock, player)) {
            emit('kill');
            player.reserve[player.weapon] += WEAPONS[player.weapon].mag;
            toast(`ניצחתם את ${bot.name}`);
            cb.onHit?.(true);
        } else cb.onHit?.(false);
    }

    function fire() {
        const w = WEAPONS[player.weapon];
        if (player.cooldown > 0 || player.reloading > 0) return false;
        if (player.mags[w.id] <= 0) { reload(); return false; }
        camera.getWorldDirection(v3);
        const dir = [v3.x, v3.y, v3.z];
        const origin = [camera.position.x + v3.x * cam.actual, camera.position.y + v3.y * cam.actual, camera.position.z + v3.z * cam.actual];
        const live = [...(botsOn ? bots : []), ...force.officers].filter((b) => !b.dead);
        if (coarse) {
            // Touch aim assist: snap to an opponent close to the crosshair.
            let bestDot = 0.985;
            for (const b of live) {
                const ax = b.x - origin[0], ay = b.y + 1 - origin[1], az = b.z - origin[2], len = Math.hypot(ax, ay, az) || 1;
                const dot = (ax * v3.x + ay * v3.y + az * v3.z) / len;
                if (dot > bestDot && len < w.range) { bestDot = dot; dir[0] = ax / len; dir[1] = ay / len; dir[2] = az / len; }
            }
        }
        const muzzle = [player.x - Math.sin(cam.yaw) * 0.7, player.y + 1.4, player.z - Math.cos(cam.yaw) * 0.7];
        for (const p of shoot(world, origin, dir, w, live, Math.random)) {
            drawShot(muzzle, p.end, !!p.target);
            if (p.target) hitBot(p.target, p.damage);
        }
        player.mags[w.id]--;
        player.cooldown = 1 / w.rate;
        player.lastShot = clock;
        noise = { x: player.x, y: player.y, z: player.z, time: clock };
        if (policeOn) reportGunfire(force, player.x, player.z);
        cb.onSound?.('shot', w.id);
        return true;
    }

    function collectCrates() {
        const loc = locationOf(world, player.x, player.y, player.z);
        if (!loc.b) return;
        for (const p of cratesOf[loc.b.index]) {
            if (p.level !== loc.level || crateReady[p.id] > clock || Math.hypot(player.x - p.x, player.z - p.z) > 1.3) continue;
            crateReady[p.id] = clock + 90;
            showCrate(p, false);
            if (p.kind === 'med') { player.hp = Math.min(100, player.hp + 50); toast('ערכת עזרה ראשונה: +50 בריאות'); }
            else {
                const w = WEAPONS[p.kind];
                const fresh = !progress.weapons.includes(p.kind);
                if (fresh) emit('weapon', p.kind);
                player.reserve[p.kind] = Math.min(w.mag * 8, player.reserve[p.kind] + w.mag * 2);
                toast(fresh ? `נשק חדש: ${w.name}!` : `תחמושת ל${w.name}`);
                if (fresh) setWeapon(p.kind);
            }
            emit('crate');
        }
    }

    function readInput() {
        let mx = input.mx, my = input.my;
        if (keys.has('KeyW') || keys.has('ArrowUp')) my += 1;
        if (keys.has('KeyS') || keys.has('ArrowDown')) my -= 1;
        if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
        if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
        const len = Math.hypot(mx, my);
        if (len > 1) { mx /= len; my /= len; }
        const shift = keys.has('ShiftLeft') || keys.has('ShiftRight');
        return { mx, my, jump: input.jump || keys.has('Space'), down: input.down || shift, run: shift, fire: input.fire || keys.has('KeyF') };
    }

    function updateFoot(dt, i) {
        const dx = -Math.sin(cam.yaw) * i.my + Math.cos(cam.yaw) * i.mx;
        const dz = -Math.cos(cam.yaw) * i.my - Math.sin(cam.yaw) * i.mx;
        const moving = Math.hypot(dx, dz) > 0.05;
        const px = player.x, pz = player.z;
        stepActor(world, player, dx, dz, i.run ? 10.5 : 6.2, dt, i.jump);
        player.speed = Math.hypot(player.x - px, player.z - pz) / dt;

        const w = WEAPONS[player.weapon];
        player.cooldown -= dt;
        if (player.reloading > 0 && (player.reloading -= dt) <= 0) {
            const take = Math.min(w.mag - player.mags[w.id], player.reserve[w.id]);
            player.mags[w.id] += take; player.reserve[w.id] -= take;
        }
        // Semi-automatic weapons fire once per trigger pull; a pull during the
        // cooldown is remembered until the shot goes off.
        if (i.fire && (w.auto || !fireLatch) && fire()) fireLatch = true;
        if (!i.fire) fireLatch = false;
        collectCrates();
        updateHeist(dt);

        const aiming = clock - player.lastShot < 1.2 || i.fire;
        if (aiming) player.heading = angleLerp(player.heading, cam.yaw + Math.PI, Math.min(1, dt * 20));
        else if (moving) player.heading = angleLerp(player.heading, Math.atan2(dx, dz), Math.min(1, dt * 12));
        if (moving) player.phase += dt * (i.run ? 14 : 9.5);
        swingHuman(player.mesh, player.phase, moving && player.grounded ? 0.75 : player.grounded ? 0 : 0.35, true);
    }

    function updateLift(dt) {
        const dy = lift.y - player.y;
        const stepY = Math.max(10, Math.abs(dy) * 2) * dt;
        player.x += (lift.b.lift.x - player.x) * Math.min(1, dt * 8);
        player.z += (lift.b.lift.z - player.z) * Math.min(1, dt * 8);
        player.vy = 0; player.speed = 0;
        if (Math.abs(dy) <= stepY) {
            player.y = lift.y; player.grounded = true; mode = 'foot'; lift = null;
        } else player.y += Math.sign(dy) * stepY;
        swingHuman(player.mesh, 0, 0, true);
    }

    function updateCar(dt, i) {
        const c = vehicle, s = c.spec;
        if (i.my > 0) c.speed += s.accel * i.my * dt;
        else if (i.my < 0) c.speed += (c.speed > 0 ? 32 : 9) * i.my * dt;
        c.speed -= c.speed * 0.55 * dt;
        if (Math.abs(i.my) < 0.05 && Math.abs(c.speed) < 0.3) c.speed = 0;
        c.speed = clamp(c.speed, -8, s.max);
        c.yaw -= i.mx * s.turn * dt * clamp(c.speed / 5, -1, 1);
        const nx = c.x + Math.sin(c.yaw) * c.speed * dt, nz = c.z + Math.cos(c.yaw) * c.speed * dt;
        const out = resolveSolids(world, nx, nz, 0, 1.5);
        const cx = clamp(out.x, -HALF - 70, HALF + 70), cz = clamp(out.z, -HALF - 70, SEA_Z - 1);
        if (out.hit || cz !== out.z) c.speed *= -0.25;
        travelled += Math.hypot(cx - c.x, cz - c.z);
        c.x = cx; c.z = cz;
        if (Math.abs(c.speed) > 7) for (const o of force.officers) {
            if (!o.dead && o.y < 1 && Math.hypot(o.x - c.x, o.z - c.z) < 1.9) hitBot(o, 150);
        }
        if (botsOn && Math.abs(c.speed) > 7) for (const b of bots) {
            if (!b.dead && b.y < 1 && Math.hypot(b.x - c.x, b.z - c.z) < 1.9) hitBot(b, 150);
        }
        Object.assign(player, { x: c.x, y: 0, z: c.z, speed: Math.abs(c.speed) });
    }

    function updateBoat(dt, i) {
        const b = vehicle, s = b.spec;
        b.speed += s.accel * i.my * (i.my < 0 ? 0.5 : 1) * dt;
        b.speed -= b.speed * 0.5 * dt;
        b.speed = clamp(b.speed, -5, s.max);
        b.yaw -= i.mx * s.turn * dt * clamp(b.speed / 4, -1, 1);
        const nx = b.x + Math.sin(b.yaw) * b.speed * dt, nz = b.z + Math.cos(b.yaw) * b.speed * dt;
        const out = resolveSolids(world, nx, nz, WATER_Y, 1.5);
        const bx = clamp(out.x, -800, 800), bz = clamp(out.z, SEA_Z + 8, SEA_Z + 800);
        if (out.hit || bz !== out.z || bx !== out.x) b.speed *= 0.3;
        travelled += Math.hypot(bx - b.x, bz - b.z);
        b.x = bx; b.z = bz;
        Object.assign(player, { x: b.x, y: WATER_Y, z: b.z, speed: Math.abs(b.speed) });
    }

    function updateHeli(dt, i) {
        const h = heli;
        const g = groundAt(world, h.x, h.z, h.y);
        const airborne = h.y - g > 0.05;
        h.vy += ((i.jump ? 9 : i.down ? -9 : 0) - h.vy) * Math.min(1, dt * 2.5);
        if (airborne) {
            h.yaw -= i.mx * 1.5 * dt;
            const sp = i.my * (i.my > 0 ? 22 : 8);
            const out = resolveSolids(world, h.x + Math.sin(h.yaw) * sp * dt, h.z + Math.cos(h.yaw) * sp * dt, h.y, 2.4);
            h.x = clamp(out.x, -HALF - 300, HALF + 300); h.z = clamp(out.z, -HALF - 300, SEA_Z + 600);
            h.mesh.rotation.x = angleLerp(h.mesh.rotation.x, i.my * 0.16, dt * 3);
        } else h.mesh.rotation.x = 0;
        h.y = clamp(h.y + h.vy * dt, Math.max(groundAt(world, h.x, h.z, h.y), 0), 160);
        if (h.y <= g && h.vy < 0) h.vy = 0;
        Object.assign(player, { x: h.x, y: h.y, z: h.z, speed: Math.abs(i.my) * 20 });
    }

    function updateBots(dt) {
        target.x = player.x; target.y = player.y; target.z = player.z; target.dead = player.dead; target.speed = player.speed;
        const ctx = {
            world, target, time: clock, rand: Math.random, stage: progress.stage, noise,
            onShot: (bot, origin, pellets) => {
                for (const p of pellets) {
                    drawShot([origin[0] + Math.sin(bot.heading) * 0.6, origin[1] - 0.1, origin[2] + Math.cos(bot.heading) * 0.6], p.end, !!p.target);
                    if (p.target) damagePlayer(p.damage);
                }
            }
        };
        bots.forEach((b, n) => {
            updateBot(b, dt, ctx);
            const view = botViews[n];
            view.mesh.visible = !b.dead;
            if (b.dead) return;
            if (view.weapon !== b.weapon) { view.weapon = b.weapon; setGun(view.mesh, b.weapon); }
            if (b.moving) view.phase += dt * 10;
            view.mesh.position.set(b.x, b.y, b.z);
            view.mesh.rotation.y = b.heading;
            swingHuman(view.mesh, view.phase, b.moving ? 0.7 : 0, true);
            view.bar.scale.x = Math.max(0.02, b.hp / 100);
            view.bar.quaternion.copy(view.mesh.quaternion).invert().multiply(camera.quaternion);
        });
    }

    function updatePolice(dt) {
        const onFoot = mode === 'foot' || mode === 'lift';
        target.x = player.x; target.y = player.y; target.z = player.z; target.dead = player.dead; target.speed = player.speed;
        updateForce(force, dt, {
            world, time: clock, rand: Math.random, target,
            player: { x: player.x, y: player.y, z: player.z, dead: player.dead, speed: player.speed, onFoot, vehicleSpeed: vehicle ? Math.abs(vehicle.speed ?? 0) : 0 },
            onShot: (o, origin, pellets) => {
                cb.onSound?.('shot', o.weapon);
                for (const p of pellets) {
                    drawShot([origin[0] + Math.sin(o.heading) * 0.6, origin[1] - 0.1, origin[2] + Math.cos(o.heading) * 0.6], p.end, !!p.target);
                    if (p.target) damagePlayer(p.damage);
                }
            },
            onRam: (dmg) => damagePlayer(dmg),
            onArrest: arrested,
            onEscape: (level) => {
                emit('escape', level);
                cb.onSound?.('escape');
                toast(`ברחתם מהמשטרה! (${'★'.repeat(level)})`);
            }
        });
        drawPolice(dt);
    }
    function drawPolice(dt) {
        const flash = Math.sin(clock * 14) > 0;
        force.cars.forEach((c, n) => {
            const mesh = policeCarViews[n];
            if (!mesh) return;
            mesh.visible = true;
            mesh.position.set(c.x, 0, c.z);
            mesh.rotation.set(0, c.yaw, 0);
            const on = force.level > 0 && (c.crew > 0 || c.parked);
            mesh.userData.lights[0].emissiveIntensity = on && flash ? 6 : 0.15;
            mesh.userData.lights[1].emissiveIntensity = on && !flash ? 6 : 0.15;
        });
        for (let n = force.cars.length; n < policeCarViews.length; n++) policeCarViews[n].visible = false;
        force.officers.forEach((o, n) => {
            const view = officerViews[n];
            if (!view) return;
            view.mesh.visible = true;
            if (view.weapon !== o.weapon) { view.weapon = o.weapon; setGun(view.mesh, o.weapon); }
            if (o.moving && !o.dead) view.phase += dt * 10;
            view.mesh.position.set(o.x, o.y + (o.dead ? 0.25 : 0), o.z);
            view.mesh.rotation.set(o.dead ? -Math.PI / 2 : 0, o.heading, 0);
            swingHuman(view.mesh, view.phase, o.moving && !o.dead ? 0.7 : 0, true);
        });
        for (let n = force.officers.length; n < officerViews.length; n++) officerViews[n].mesh.visible = false;
    }

    function updateCitizens(dt) {
        for (const c of citizens) {
            const talking = chattingId === c.id;
            if (talking) c.mesh.rotation.y = Math.atan2(player.x - c.x, player.z - c.z);
            else if (c.pause > 0) c.pause -= dt;
            else {
                c.p = (c.p + c.dir * c.speed * dt + 124) % 124;
                c.phase += dt * c.speed * 5;
                if (rand() < dt * 0.04) c.pause = 1.5 + rand() * 3;
                if (rand() < dt * 0.015) c.dir *= -1;
            }
            placeCitizen(c);
            swingHuman(c.mesh, c.phase, talking || c.pause > 0 ? 0 : 0.6);
            if (c.bubbleTime > 0) {
                c.bubbleTime -= dt;
                v3.set(c.x, PAD_H + 2.25, c.z).project(camera);
                if (c.bubbleTime <= 0 || v3.z > 1 || talking) c.bubble.style.display = 'none';
                else {
                    c.bubble.style.display = 'block';
                    c.bubble.style.transform = `translate(-50%, -100%) translate(${((v3.x + 1) / 2) * container.clientWidth}px, ${((1 - v3.y) / 2) * container.clientHeight}px)`;
                }
            }
        }
        bubbleTick -= dt;
        if (bubbleTick <= 0 && started) {
            bubbleTick = 3.5 + rand() * 3.5;
            const near = citizens.filter((c) => c.bubbleTime <= 0 && c.id !== chattingId && Math.hypot(c.x - player.x, c.z - player.z) < 32);
            if (near.length) {
                const c = near[Math.floor(rand() * near.length)];
                c.bubble.textContent = AMBIENT_LINES[Math.floor(rand() * AMBIENT_LINES.length)];
                c.bubbleTime = 3.6;
            }
        }
    }

    function updateEnvironment(dt) {
        if (env.cycle && started) env.hour = (env.hour + dt / 20) % 24;
        const h = env.hour, w = WEATHER[env.weather];
        let k = 0;
        while (k < SKY_KEYS.length - 2 && h >= SKY_KEYS[k + 1][0]) k++;
        const [h0, c0] = SKY_KEYS[k], [h1, c1] = SKY_KEYS[k + 1];
        tmpColor.set(c0).lerp(grayColor.set(c1), (h - h0) / (h1 - h0));
        const a = ((h - 6) / 12) * Math.PI, elev = Math.sin(a), day = smooth(-0.12, 0.3, elev);
        grayColor.set(w.gray).multiplyScalar(0.12 + 0.88 * day);
        tmpColor.lerp(grayColor, w.mix);
        scene.background.copy(tmpColor);
        scene.fog.color.copy(tmpColor);
        scene.fog.near += (w.near - scene.fog.near) * Math.min(1, dt * 1.5);
        scene.fog.far += (w.far - scene.fog.far) * Math.min(1, dt * 1.5);
        skyMat.uniforms.horizon.value.copy(tmpColor);
        topColor.setRGB(tmpColor.r * 0.3, tmpColor.g * 0.46, tmpColor.b * 0.82).lerp(tmpColor, w.mix * 0.8);
        skyMat.uniforms.top.value.copy(topColor);
        sky.position.copy(camera.position);

        const isDay = elev > -0.05, s = isDay ? 1 : -1;
        v3.set(Math.cos(a) * s, Math.max(0.12, Math.abs(elev)), 0.38).normalize();
        sun.color.set(isDay ? (elev < 0.3 ? '#ffc48a' : '#fff1d6') : '#8fa8d8');
        sun.intensity = isDay ? 3 * day * w.dim : 0.35 * w.dim;
        sun.target.position.set(player.x, player.y, player.z);
        sun.position.copy(sun.target.position).addScaledVector(v3, 200);
        hemi.intensity = (0.2 + 0.85 * day) * (0.55 + 0.45 * w.dim);
        scene.environmentIntensity = 0.06 + 0.3 * day * w.dim;
        orb.position.copy(camera.position).addScaledVector(v3, 1800);
        orb.material.color.set(isDay ? '#fff3d0' : '#dfe6f2');
        orb.scale.setScalar(isDay ? 1 : 0.7);
        orb.visible = w.mix < 0.8;
        stars.position.copy(camera.position);
        stars.material.opacity = (1 - day) * w.stars;
        cloudMat.opacity = w.cloud * (0.12 + 0.5 * day);
        cloudMat.color.copy(tmpColor).lerp(grayColor.set('#ffffff'), 0.7 * day * (1 - w.mix * 0.5));
        cloudSeeds.forEach((c, n) => {
            const x = ((c.x + clock * 4 + 1200) % 2400) - 1200 + camera.position.x;
            for (let p = 0; p < 3; p++) {
                mTmp.makeScale(c.s * (1.6 - p * 0.35), c.s * 0.34, c.s * (1 - p * 0.2)).setPosition(x + (p - 1) * c.s * 0.9, c.y + p * 6, c.z + camera.position.z + (p % 2) * c.s * 0.4);
                clouds.setMatrixAt(n * 3 + p, mTmp);
            }
        });
        clouds.instanceMatrix.needsUpdate = true;

        const night = 1 - day;
        for (const m of glowMats) m.emissiveIntensity = night * 2.6;
        bulbMat.emissiveIntensity = night * 5;
        beaconMat.emissiveIntensity = 0.4 + night * 2;
        beacon.rotation.y += dt * 0.8;
        ripples.offset.set(clock * 0.012, clock * 0.02);

        rain.visible = w.rain;
        if (w.rain) {
            const fall = (clock * 38) % 45;
            for (let n = 0; n < RAIN; n++) {
                const x = camera.position.x + rainSeed[n * 3], z = camera.position.z + rainSeed[n * 3 + 2];
                const y = camera.position.y - 14 + ((rainSeed[n * 3 + 1] - fall + 45) % 45);
                rainPos.set([x, y, z, x + 0.05, y - 0.9, z], n * 6);
            }
            rainGeo.attributes.position.needsUpdate = true;
        }
    }

    function updateEffects(dt) {
        for (const t of tracers) if (t.visible && (t.userData.life -= dt) <= 0) t.visible = false; else if (t.visible) t.material.opacity = t.userData.life / 0.07;
        for (const s of sparks) if (s.visible && (s.userData.life -= dt) <= 0) s.visible = false; else if (s.visible) s.material.opacity = s.userData.life / 0.16;
        for (const p of world.pickups) if (crateReady[p.id] && crateReady[p.id] <= clock) { crateReady[p.id] = 0; showCrate(p, true); }
    }

    function updateCamera(dt) {
        let tx, ty, tz, want;
        if (!started) {
            cam.yaw += dt * 0.07;
            tx = 0; ty = 6; tz = 0;
            cam.dist += (64 - cam.dist) * Math.min(1, dt * 2);
            want = cam.dist;
        } else {
            const onFoot = mode === 'foot' || mode === 'lift';
            // On foot the camera sits over the right shoulder so the crosshair is clear.
            const side = onFoot ? 0.55 : 0;
            tx = player.x + Math.cos(cam.yaw) * side; ty = player.y + (onFoot ? 1.6 : 1.9); tz = player.z - Math.sin(cam.yaw) * side;
            if (!onFoot && Math.abs(vehicle.speed ?? 2) > 1 && clock - cam.lastDrag > 1.8) cam.yaw = angleLerp(cam.yaw, vehicle.yaw + Math.PI, Math.min(1, dt * 2.2));
            want = cam.dist * (mode === 'heli' ? 1.9 : mode === 'boat' ? 1.5 : mode === 'car' ? 1.35 : 1);
        }
        const f = Math.min(1, dt * 12);
        cam.tx += (tx - cam.tx) * f; cam.ty += (ty - cam.ty) * f; cam.tz += (tz - cam.tz) * f;
        const cp = Math.cos(cam.pitch);
        const dx = cp * Math.sin(cam.yaw), dy = Math.sin(cam.pitch), dz = cp * Math.cos(cam.yaw);
        // Keep walls, ceilings and floors from coming between the camera and the player.
        const free = started ? rayWorld(world, cam.tx, cam.ty, cam.tz, dx, dy, dz, want + 0.4) - 0.4 : want;
        cam.actual = clamp(Math.min(want, free), 0.7, want);
        camera.position.set(cam.tx + dx * cam.actual, cam.ty + dy * cam.actual, cam.tz + dz * cam.actual);
        camera.lookAt(cam.tx, cam.ty, cam.tz);
    }

    function report() {
        const t = nearest();
        promptTarget = t;
        const landed = mode === 'heli' && heli.y - groundAt(world, heli.x, heli.z, heli.y) < 0.4;
        const text = !started || chattingId !== null || player.dead ? null
            : mode === 'car' ? 'יציאה מהרכב' : mode === 'boat' ? 'ירידה מהסירה' : mode === 'heli' ? (landed ? 'ירידה מהמסוק' : null) : t?.text || null;
        if (text !== lastPrompt) { lastPrompt = text; cb.onPrompt?.(text); }
        const where = locate(world, player.x, player.y, player.z);
        if (where !== lastLocation) { lastLocation = where; cb.onLocation?.(where); }

        if (started && !player.dead) {
            const loc = locationOf(world, player.x, player.y, player.z);
            const key = loc.b ? `${loc.b.index}:${loc.level}` : '';
            if (key !== lastLocKey && (mode === 'foot') && player.grounded) {
                lastLocKey = key;
                if (loc.b) emit(loc.level >= loc.b.floors ? 'roof' : 'floor', loc.level >= loc.b.floors ? loc.b.floors : loc.level);
            }
            const top = mode === 'foot' && player.y > hill.top - 0.2 && Math.abs(player.x - hill.cx) < 5 && Math.abs(player.z - hill.cz) < 5;
            if (top && !onSummit) emit('summit');
            onSummit = top;
            if (travelled >= 1) { emit(mode === 'boat' ? 'sail' : 'drive', travelled); travelled = 0; }
        }

        const hud = mode === 'car' || mode === 'boat' ? { mode, label: vehicle.spec.label, speed: Math.round(Math.abs(vehicle.speed) * 3.6) }
            : mode === 'heli' ? { mode, alt: Math.round(heli.y) } : null;
        const hudKey = JSON.stringify(hud);
        if (hudKey !== lastHud) { lastHud = hudKey; cb.onHud?.(hud); }
        const shown = Math.round(env.hour * 12);
        if (shown !== lastHourSent) { lastHourSent = shown; cb.onHour?.(env.hour); }

        const w = WEAPONS[player.weapon];
        const status = {
            hp: Math.ceil(player.hp), dead: player.dead, weapon: w.id, weaponName: w.name, mag: player.mags[w.id], reserve: player.reserve[w.id],
            reloading: player.reloading > 0, owned: WEAPON_ORDER.filter((id) => progress.weapons.includes(id)), kills: progress.kills, deaths: progress.deaths,
            bots: botsOn, armed: mode === 'foot', locked,
            cash: progress.cash, wanted: force.level, police: policeOn,
            searching: force.level > 0 && !force.seen && force.unseen > 0 ? Math.min(1, force.unseen / escapeTime(force.level)) : 0,
            heist: heist ? { name: heist.s.biz.name, pct: Math.floor((heist.t / heist.need) * 100) } : null
        };
        const statusKey = JSON.stringify(status);
        if (statusKey !== lastStatus) { lastStatus = statusKey; cb.onStatus?.(status); }
        const stage = stageView(progress, botsOn);
        const stageKey = JSON.stringify(stage);
        if (stageKey !== lastStage) { lastStage = stageKey; cb.onStage?.(stage); }
    }

    /** One simulation step; rendering is separate so tests can fast-forward. */
    function update(dt) {
        clock += dt;
        if (started) {
            const i = readInput();
            if (player.dead) {
                if ((player.deadT -= dt) <= 0) respawn();
            } else if (mode === 'lift') updateLift(dt);
            else if (chattingId !== null) { player.speed = 0; }
            else if (mode === 'foot') updateFoot(dt, i);
            else if (mode === 'car') updateCar(dt, i);
            else if (mode === 'boat') updateBoat(dt, i);
            else updateHeli(dt, i);
            if (!player.dead && clock - player.lastHurt > 6 && player.hp < 100) player.hp = Math.min(100, player.hp + 6 * dt);
            if (botsOn) updateBots(dt);
            if (policeOn) updatePolice(dt);
        }
        player.mesh.position.set(player.x, player.y, player.z);
        player.mesh.rotation.y = player.heading;
        player.mesh.rotation.x = player.dead ? -Math.PI / 2 : 0;
        if (player.dead) player.mesh.position.y += 0.25;
        for (const v of vehicles) {
            if (v.kind === 'car') { v.mesh.position.set(v.x, 0, v.z); v.mesh.rotation.set(0, v.yaw, 0); }
            else {
                v.mesh.position.set(v.x, WATER_Y - 0.25 + Math.sin(clock * 1.4 + v.phase) * 0.06, v.z);
                v.mesh.rotation.set(Math.sin(clock * 1.1 + v.phase) * 0.03 - clamp(v.speed / 60, 0, 0.3), v.yaw, Math.sin(clock * 0.9 + v.phase) * 0.04);
            }
        }
        heli.spin += ((mode === 'heli' ? 26 : 0) - heli.spin) * Math.min(1, dt * 1.2);
        heli.mesh.userData.rotor.rotation.y += heli.spin * dt;
        heli.mesh.userData.tailRotor.rotation.x += heli.spin * 2 * dt;
        heli.mesh.position.set(heli.x, heli.y, heli.z); heli.mesh.rotation.y = heli.yaw;
        updateCamera(dt);
        updateCitizens(dt);
        updateEnvironment(dt);
        updateEffects(dt);
        slowTick -= dt;
        if (slowTick <= 0) { slowTick = 0.2; report(); }
        saveTick -= dt;
        if (dirty && saveTick <= 0 && storage) { saveProgress(storage, progress); dirty = false; saveTick = 3; }
    }

    function frame(now) {
        if (disposed) return;
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (paused) return;
        update(dt);
        if (composer) composer.render(); else renderer.render(scene, camera);
    }

    // --- events --------------------------------------------------------------
    const typing = (e) => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target?.tagName || '');
    const onKeyDown = (e) => {
        if (typing(e)) return;
        if (!e.repeat) {
            if (e.code === 'KeyE') interact();
            else if (e.code === 'KeyR') reload();
            else if (e.code === 'KeyQ') nextWeapon();
            else if (/^Digit[1-5]$/.test(e.code)) setWeapon(WEAPON_ORDER[Number(e.code[5]) - 1]);
        }
        if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
        keys.add(e.code);
    };
    const onKeyUp = (e) => keys.delete(e.code);
    const onBlur = () => { keys.clear(); input.fire = false; };
    let dragId = null, px = 0, py = 0;
    const look = (dx, dy) => {
        cam.yaw -= dx * 0.0052;
        cam.pitch = clamp(cam.pitch + dy * 0.004, -0.5, 1.35);
        cam.lastDrag = clock;
    };
    const onDown = (e) => {
        if (locked) { if (e.button === 0) input.fire = true; return; }
        dragId = e.pointerId; px = e.clientX; py = e.clientY;
        canvas.setPointerCapture(e.pointerId);
        // With a mouse, a click captures the pointer: move to aim, click to shoot.
        if (started && e.pointerType === 'mouse' && e.button === 0 && canvas.requestPointerLock) {
            try { Promise.resolve(canvas.requestPointerLock()).catch(() => {}); } catch { /* not allowed right now */ }
        }
    };
    const onMove = (e) => {
        if (locked) { look(e.movementX, e.movementY); return; }
        if (e.pointerId !== dragId) return;
        look(e.clientX - px, e.clientY - py);
        px = e.clientX; py = e.clientY;
    };
    const onUp = (e) => { if (locked) input.fire = false; if (e.pointerId === dragId) dragId = null; };
    const onWheel = (e) => { e.preventDefault(); cam.dist = clamp(cam.dist * (e.deltaY > 0 ? 1.1 : 0.9), 3, 40); };
    const onLock = () => { locked = document.pointerLockElement === canvas; if (!locked) input.fire = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('pointerlockchange', onLock);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    const releasePointer = () => { if (document.pointerLockElement === canvas) document.exitPointerLock(); };

    const resize = () => {
        const w = container.clientWidth || 1, h = container.clientHeight || 1;
        renderer.setSize(w, h);
        composer?.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    citizens.forEach(placeCitizen);
    raf = requestAnimationFrame(frame);

    function setBots(on) {
        botsOn = !!on;
        bots = botsOn ? createBots(BOT_COUNT, Math.random, progress.stage, player) : [];
        if (!botsOn) for (const v of botViews) v.mesh.visible = false;
        lastStage = ''; lastStatus = '';
        report();
    }

    return {
        start({ bots: withBots = true } = {}) {
            started = true; cam.dist = 7; cam.yaw = 0; cam.pitch = 0.3;
            setBots(withBots);
        },
        interact, rideTo, reload, nextWeapon, setWeapon, setBots, releasePointer,
        setPolice(on) {
            policeOn = !!on;
            force = createForce(policeOn ? undefined : 0);
            drawPolice(0);
            lastStatus = '';
            report();
        },
        setMove(x, y) { input.mx = x; input.my = y; },
        setJump(v) { input.jump = v; },
        setDown(v) { input.down = v; },
        setFire(v) { input.fire = v; },
        setWeather(v) { if (WEATHER[v]) env.weather = v; },
        setHour(v) { env.hour = clamp(v, 0, 23.99); },
        setCycle(v) { env.cycle = v; },
        setChat(id) { chattingId = id; if (id !== null) releasePointer(); },
        resetProgress() {
            progress = initialProgress();
            if (storage) saveProgress(storage, progress);
            setWeapon('pistol'); player.weapon = 'pistol'; setGun(player.mesh, 'pistol');
            if (botsOn) setBots(true);
            lastStage = ''; lastStatus = '';
            report();
            toast('ההתקדמות אופסה');
        },
        /** Read-only snapshot, used by tests and debugging. */
        snapshot: () => ({
            mode, started, hour: env.hour, weather: env.weather, bots: botsOn, prompt: promptTarget?.type || null,
            player: { x: player.x, y: player.y, z: player.z, hp: player.hp, dead: player.dead, weapon: player.weapon, mag: player.mags[player.weapon], reserve: player.reserve[player.weapon] },
            progress: { ...progress },
            botList: bots.map((b) => ({ x: b.x, y: b.y, z: b.z, hp: b.hp, dead: b.dead, weapon: b.weapon })),
            police: {
                on: policeOn, wanted: force.level, unseen: force.unseen, seen: force.seen, aggressive: force.aggressive,
                cars: force.cars.map((c) => ({ x: c.x, z: c.z, speed: c.speed, crew: c.crew, patrol: c.patrol, parked: c.parked })),
                officers: force.officers.map((o) => ({ x: o.x, y: o.y, z: o.z, hp: o.hp, dead: o.dead, weapon: o.weapon }))
            },
            heist: heist ? { business: heist.s.biz.id, t: heist.t, need: heist.need } : null,
            vehicle: vehicle && vehicle.spec ? { kind: vehicle.kind, type: vehicle.type, x: vehicle.x, z: vehicle.z, speed: vehicle.speed } : null,
            heli: { x: heli.x, y: heli.y, z: heli.z }
        }),
        /** Hooks for automated tests: fast-forward time and set up situations. */
        debug: {
            world,
            /** Stop the real-time loop so a test drives time alone with advance(). */
            pause(v) { paused = v; },
            render() { if (composer) composer.render(); else renderer.render(scene, camera); },
            advance(seconds) { for (let t = 0; t < seconds * 60; t++) update(1 / 60); },
            teleport(x, y, z) { Object.assign(player, { x, y, z, vy: 0, grounded: true }); },
            look(yaw, pitch) { cam.yaw = yaw; cam.pitch = pitch; },
            moveBot(n, x, y, z) { if (bots[n]) Object.assign(bots[n], { x, y, z, vy: 0, path: null }); },
            businesses: () => safes.map((s0) => ({ ...s0.biz, robbed: s0.robbedUntil > clock })),
            wanted(level) { raiseWanted(force, level); report(); },
            clearWanted() { clearWanted(force); report(); },
            moveOfficer(n, x, y, z) { if (force.officers[n]) Object.assign(force.officers[n], { x, y, z, vy: 0, path: null }); },
            freezeBots(v) { for (const b of bots) { b.hunter = !v; if (v) { b.known = null; b.knownAt = -99; } } },
            hurt: damagePlayer,
            citizens: () => citizens.map((c) => ({ id: c.id, name: c.name, x: c.x, z: c.z })),
            crates: () => world.pickups.map((p) => ({ ...p, ready: crateReady[p.id] <= clock })),
            vehicles: () => vehicles.map((v) => ({ kind: v.kind, type: v.type, x: v.x, z: v.z, unlocked: isUnlocked(v) })),
            emit(event, value) { emit(event, value); report(); }
        },
        dispose() {
            disposed = true;
            cancelAnimationFrame(raf);
            observer.disconnect();
            releasePointer();
            if (dirty && storage) saveProgress(storage, progress);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
            document.removeEventListener('pointerlockchange', onLock);
            scene.traverse((o) => {
                o.geometry?.dispose();
                for (const m of [].concat(o.material || [])) {
                    m.map?.dispose(); m.emissiveMap?.dispose(); m.normalMap?.dispose(); m.dispose();
                }
            });
            textures.forEach((t) => { t.wall.dispose(); t.glow.dispose(); });
            envTarget.dispose();
            composer?.dispose();
            renderer.dispose();
            canvas.remove();
            bubbleLayer.replaceChildren();
        }
    };
}
