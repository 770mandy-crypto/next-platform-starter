// The 3D side of the game: builds the city with three.js and runs the
// simulation loop. It knows nothing about React; the UI talks to it through the
// object returned by createGame and listens through the callbacks it passes in.
import * as THREE from 'three';
import { CELL, FLOOR, HALF, N, PAD_H, BLOCK, generateWorld, groundAt, locate, resolveSolids, rng } from './world';
import { AMBIENT_LINES, CITIZENS } from './dialog';

const SKY_KEYS = [
    [0, '#060b18'], [5, '#0b1426'], [6.5, '#e39a72'], [8, '#8cc0e6'],
    [16.5, '#8cc0e6'], [18.5, '#e88a5c'], [20, '#0d1730'], [24, '#060b18']
];
const WEATHER = {
    clear: { gray: '#8cc0e6', mix: 0, dim: 1, near: 150, far: 750, rain: false, stars: 1 },
    cloudy: { gray: '#8a949c', mix: 0.65, dim: 0.5, near: 110, far: 560, rain: false, stars: 0.15 },
    rain: { gray: '#5f6a73', mix: 0.85, dim: 0.32, near: 30, far: 260, rain: true, stars: 0 },
    fog: { gray: '#aab3b8', mix: 0.9, dim: 0.45, near: 6, far: 95, rain: false, stars: 0 }
};
const SHIRTS = ['#c4553f', '#3f6fa8', '#d9b44a', '#4f8a5b', '#8a5aa8', '#d97b3a', '#3e8f9a', '#b34a6b'];
const PANTS = ['#2f3b4c', '#4a4038', '#3b4a3f', '#55524c'];
const CAR_COLORS = ['#b8443a', '#e0c070', '#3d6f9e', '#e9e6dc', '#3f7f6a', '#2e3238'];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function angleLerp(a, b, t) {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
}

function windowTextures(seed) {
    const r = rng(seed);
    const make = () => { const c = document.createElement('canvas'); c.width = c.height = 256; return c; };
    const wall = make(), glow = make();
    const w = wall.getContext('2d'), g = glow.getContext('2d');
    w.fillStyle = '#ffffff'; w.fillRect(0, 0, 256, 256);
    g.fillStyle = '#000000'; g.fillRect(0, 0, 256, 256);
    for (let cx = 0; cx < 8; cx++) for (let cy = 0; cy < 8; cy++) {
        const x = cx * 32 + 7, y = cy * 32 + 6;
        w.fillStyle = '#6f808c'; w.fillRect(x, y, 18, 20);
        w.fillStyle = '#8fa1ad'; w.fillRect(x, y, 18, 3);
        if (r() < 0.5) {
            const v = 150 + Math.floor(r() * 105);
            g.fillStyle = `rgb(${v},${Math.floor(v * 0.82)},${Math.floor(v * 0.55)})`;
            g.fillRect(x, y, 18, 20);
        }
    }
    const tex = (c) => {
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
    };
    return { wall: tex(wall), glow: tex(glow) };
}

function instancedBoxes(list, material) {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, list.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    list.forEach((b, n) => {
        m.compose(new THREE.Vector3(b.x, b.y, b.z), q, new THREE.Vector3(b.sx, b.sy, b.sz));
        mesh.setMatrixAt(n, m);
        if (b.color) mesh.setColorAt(n, c.set(b.color));
    });
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
}

function makeHuman(shirt, pants, hair) {
    const g = new THREE.Group();
    const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const skin = mat('#e2b594');
    const add = (geo, material, x, y, z, parent = g) => {
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        parent.add(mesh);
        return mesh;
    };
    add(new THREE.BoxGeometry(0.5, 0.62, 0.28), mat(shirt), 0, 1.17, 0);
    add(new THREE.SphereGeometry(0.17, 14, 10), skin, 0, 1.66, 0);
    add(new THREE.SphereGeometry(0.18, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(hair), 0, 1.68, -0.01);
    const limb = (w, h, material, x, y) => {
        const pivot = new THREE.Group();
        pivot.position.set(x, y, 0);
        add(new THREE.BoxGeometry(w, h, w), material, 0, -h / 2, 0, pivot);
        g.add(pivot);
        return pivot;
    };
    const legMat = mat(pants), armMat = mat(shirt);
    g.userData.parts = {
        legL: limb(0.2, 0.86, legMat, -0.13, 0.86), legR: limb(0.2, 0.86, legMat, 0.13, 0.86),
        armL: limb(0.15, 0.6, armMat, -0.33, 1.45), armR: limb(0.15, 0.6, armMat, 0.33, 1.45)
    };
    return g;
}
function swingHuman(group, phase, amp) {
    const p = group.userData.parts, s = Math.sin(phase) * amp;
    p.legL.rotation.x = s; p.legR.rotation.x = -s;
    p.armL.rotation.x = -s * 0.8; p.armR.rotation.x = s * 0.8;
}

function makeCar(color) {
    const g = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.45 });
    const glass = new THREE.MeshStandardMaterial({ color: '#1c2a33', roughness: 0.15, metalness: 0.6 });
    const tyre = new THREE.MeshStandardMaterial({ color: '#16181a', roughness: 0.9 });
    const lamp = new THREE.MeshStandardMaterial({ color: '#fff3c9', emissive: '#ffe9a8', emissiveIntensity: 1.4 });
    const put = (geo, material, x, y, z) => { const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
    put(new THREE.BoxGeometry(1.9, 0.55, 4.2), paint, 0, 0.62, 0);
    put(new THREE.BoxGeometry(1.66, 0.55, 2.1), glass, 0, 1.14, -0.2);
    put(new THREE.BoxGeometry(1.7, 0.06, 2.14), paint, 0, 1.44, -0.2);
    const wheel = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 16);
    for (const x of [-0.95, 0.95]) for (const z of [-1.35, 1.35]) put(wheel, tyre, x, 0.36, z).rotation.z = Math.PI / 2;
    for (const x of [-0.62, 0.62]) put(new THREE.BoxGeometry(0.4, 0.16, 0.06), lamp, x, 0.68, 2.11);
    return g;
}

function makeHeli() {
    const g = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: '#dfc184', roughness: 0.4, metalness: 0.4 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1b2a35', roughness: 0.3, metalness: 0.5 });
    const put = (geo, material, x, y, z, parent = g) => { const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
    put(new THREE.SphereGeometry(1, 20, 14), body, 0, 1.35, 0).scale.set(1.1, 1, 1.9);
    put(new THREE.SphereGeometry(0.82, 16, 12), dark, 0, 1.5, 0.95).scale.set(1.05, 0.8, 1);
    put(new THREE.BoxGeometry(0.26, 0.26, 3.2), body, 0, 1.55, -3);
    put(new THREE.BoxGeometry(0.08, 0.9, 0.6), body, 0, 1.95, -4.4);
    for (const x of [-0.85, 0.85]) {
        put(new THREE.BoxGeometry(0.1, 0.1, 3), dark, x, 0.08, 0);
        for (const z of [-0.8, 0.8]) put(new THREE.BoxGeometry(0.07, 0.5, 0.07), dark, x, 0.33, z);
    }
    put(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8), dark, 0, 2.5, 0);
    const rotor = new THREE.Group();
    rotor.position.y = 2.72;
    put(new THREE.BoxGeometry(7.4, 0.05, 0.3), dark, 0, 0, 0, rotor);
    put(new THREE.BoxGeometry(0.3, 0.05, 7.4), dark, 0, 0, 0, rotor);
    g.add(rotor);
    g.userData.rotor = rotor;
    return g;
}

export function createGame(container, bubbleLayer, cb = {}) {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const world = generateWorld(11);
    const rand = rng(404);

    const renderer = new THREE.WebGLRenderer({ antialias: !coarse, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
    renderer.shadowMap.enabled = !coarse;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#8cc0e6');
    scene.fog = new THREE.Fog('#8cc0e6', 150, 750);
    const camera = new THREE.PerspectiveCamera(58, 1, 0.3, 1600);

    const hemi = new THREE.HemisphereLight('#cfe4f5', '#5b5346', 1);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fff1d6', 2.6);
    sun.castShadow = !coarse;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 1, far: 320 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.05;
    scene.add(sun, sun.target);

    // --- static city ---------------------------------------------------------
    const std = (color, extra) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), std('#4f6d4b'));
    grass.rotation.x = -Math.PI / 2; grass.position.y = -0.03; grass.receiveShadow = true;
    const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 + 10, HALF * 2 + 10), std('#2c3238'));
    asphalt.rotation.x = -Math.PI / 2; asphalt.receiveShadow = true;
    scene.add(grass, asphalt);

    const padColor = { building: '#b9b4a8', hill: '#a9a08e', helipad: '#8f9499', park: '#5f8a52' };
    scene.add(instancedBoxes(world.blocks.map((b) => ({ x: b.cx, y: PAD_H / 2, z: b.cz, sx: BLOCK, sy: PAD_H, sz: BLOCK, color: padColor[b.type] })), std('#ffffff')));

    const dashes = [];
    for (let k = 0; k <= N; k++) {
        const line = (k - N / 2) * CELL;
        for (let d = -HALF + 3; d < HALF; d += 7) {
            dashes.push({ x: line, y: 0.01, z: d, sx: 0.22, sy: 0.02, sz: 3 });
            dashes.push({ x: d, y: 0.01, z: line, sx: 3, sy: 0.02, sz: 0.22 });
        }
    }
    const dashMesh = instancedBoxes(dashes, std('#d8d2bd'));
    dashMesh.castShadow = false;
    scene.add(dashMesh);

    const textures = [windowTextures(1), windowTextures(2), windowTextures(3)];
    const roofMat = std('#5b6166');
    const glowMats = [];
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    for (const b of world.buildings) {
        const t = textures[b.variant];
        const map = t.wall.clone(), glow = t.glow.clone();
        map.repeat.set(b.size / 24, b.floors / 8);
        glow.repeat.copy(map.repeat);
        map.needsUpdate = glow.needsUpdate = true;
        const side = new THREE.MeshStandardMaterial({ color: b.color, map, emissiveMap: glow, emissive: '#ffd9a0', emissiveIntensity: 0, roughness: 0.8 });
        glowMats.push(side);
        const mesh = new THREE.Mesh(boxGeo, [side, side, roofMat, roofMat, side, side]);
        mesh.scale.set(b.size, b.h, b.size);
        mesh.position.set(b.cx, b.h / 2, b.cz);
        mesh.castShadow = mesh.receiveShadow = true;
        scene.add(mesh);
    }
    if (world.stepBoxes.length) scene.add(instancedBoxes(world.stepBoxes, std('#9aa3a6')));
    scene.add(instancedBoxes(world.hillBoxes, std('#ffffff')));

    // Golden beacon on the summit of the stepped hill.
    const hill = world.blocks.find((b) => b.type === 'hill');
    const beaconMat = new THREE.MeshStandardMaterial({ color: '#dfc184', emissive: '#dfc184', emissiveIntensity: 0.4, metalness: 0.6, roughness: 0.3 });
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), beaconMat);
    beacon.position.set(hill.cx, hill.top + 2.6, hill.cz);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 2, 8), std('#3b4348'));
    pole.position.set(hill.cx, hill.top + 1, hill.cz);
    scene.add(beacon, pole);

    const pad = world.blocks.find((b) => b.type === 'helipad');
    const ring = new THREE.Mesh(new THREE.RingGeometry(5.2, 5.8, 48), new THREE.MeshBasicMaterial({ color: '#dfc184' }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(pad.cx, PAD_H + 0.02, pad.cz);
    scene.add(ring);

    {
        const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.26, 2.2, 7), std('#6b4f3a'), world.trees.length);
        const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.7, 1), std('#4d7d48'), world.trees.length);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
        world.trees.forEach((t, n) => {
            m.compose(new THREE.Vector3(t.x, PAD_H + 1.1 * t.s, t.z), q, new THREE.Vector3(t.s, t.s, t.s));
            trunks.setMatrixAt(n, m);
            m.compose(new THREE.Vector3(t.x, PAD_H + 3.2 * t.s, t.z), q, new THREE.Vector3(t.s, t.s * 1.15, t.s));
            crowns.setMatrixAt(n, m);
            crowns.setColorAt(n, c.setHSL(0.3 + rand() * 0.06, 0.32, 0.3 + rand() * 0.1));
        });
        trunks.castShadow = crowns.castShadow = true;
        scene.add(trunks, crowns);
    }
    const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff1cf', emissive: '#ffd58a', emissiveIntensity: 0 });
    {
        const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.09, 4.2, 6), std('#39424a'), world.lamps.length);
        const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.26, 10, 8), bulbMat, world.lamps.length);
        const m = new THREE.Matrix4();
        world.lamps.forEach((l, n) => {
            poles.setMatrixAt(n, m.makeTranslation(l.x, PAD_H + 2.1, l.z));
            bulbs.setMatrixAt(n, m.makeTranslation(l.x, PAD_H + 4.3, l.z));
        });
        scene.add(poles, bulbs);
    }

    // --- sky -----------------------------------------------------------------
    const starPos = new Float32Array(700 * 3);
    for (let n = 0; n < 700; n++) {
        const a = rand() * Math.PI * 2, e = Math.asin(rand() * 0.95 + 0.05);
        starPos.set([Math.cos(a) * Math.cos(e) * 1200, Math.sin(e) * 1200, Math.sin(a) * Math.cos(e) * 1200], n * 3);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    const orb = new THREE.Mesh(new THREE.SphereGeometry(34, 20, 14), new THREE.MeshBasicMaterial({ color: '#fff3d0', fog: false }));
    scene.add(stars, orb);

    const RAIN = 1400;
    const rainPos = new Float32Array(RAIN * 6);
    const rainSeed = new Float32Array(RAIN * 3);
    for (let n = 0; n < RAIN; n++) rainSeed.set([(rand() - 0.5) * 70, rand() * 45, (rand() - 0.5) * 70], n * 3);
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#b9cbd6', transparent: true, opacity: 0.55 }));
    rain.frustumCulled = false; rain.visible = false;
    scene.add(rain);

    // --- actors --------------------------------------------------------------
    const player = { x: 0, y: PAD_H, z: 20.5, vy: 0, grounded: true, heading: Math.PI, phase: 0, mesh: makeHuman('#dfc184', '#22303c', '#2a1f18') };
    scene.add(player.mesh);

    const roadX = (k) => (k - N / 2) * CELL;
    const cars = [
        { x: 7, z: 24.5, yaw: Math.PI / 2 }, { x: roadX(4) + 2.5, z: -30, yaw: 0 }, { x: roadX(2) - 2.5, z: 60, yaw: Math.PI },
        { x: -60, z: roadX(5) + 2.5, yaw: -Math.PI / 2 }, { x: 80, z: roadX(2) - 2.5, yaw: Math.PI / 2 }, { x: roadX(6) + 2.5, z: 100, yaw: 0 }
    ].map((c, n) => {
        const mesh = makeCar(CAR_COLORS[n % CAR_COLORS.length]);
        scene.add(mesh);
        return { ...c, speed: 0, mesh, kind: 'car' };
    });
    const heli = { x: pad.cx, y: PAD_H, z: pad.cz, yaw: 0, vy: 0, spin: 0, mesh: makeHeli(), kind: 'heli' };
    scene.add(heli.mesh);

    const walkBlocks = world.blocks.filter((b) => b.type !== 'hill');
    const citizens = CITIZENS.map((info, n) => {
        const block = n < 4
            ? walkBlocks.filter((b) => Math.abs(b.cx) <= CELL && Math.abs(b.cz) <= CELL)[n * 2 % 8]
            : walkBlocks[Math.floor(rand() * walkBlocks.length)];
        const mesh = makeHuman(SHIRTS[n % SHIRTS.length], PANTS[n % PANTS.length], ['#2a1f18', '#5a3d25', '#1b1b1f', '#8a6a3d'][n % 4]);
        scene.add(mesh);
        const bubble = document.createElement('div');
        bubble.className = 'citizen-world-bubble';
        bubble.style.display = 'none';
        bubbleLayer.appendChild(bubble);
        return { id: n, ...info, block, p: rand() * 124, dir: rand() < 0.5 ? 1 : -1, speed: 1.2 + rand() * 0.9, pause: 0, phase: rand() * 6, mesh, bubble, bubbleTime: 0, x: 0, z: 0 };
    });

    // --- state ---------------------------------------------------------------
    const keys = new Set();
    const input = { mx: 0, my: 0, jump: false, down: false };
    const cam = { yaw: 0.6, pitch: 0.42, dist: 11, tx: 0, ty: 6, tz: 0, lastDrag: -10 };
    const env = { hour: 10, weather: 'clear', cycle: true };
    let started = false, mode = 'foot', vehicle = null, chattingId = null, disposed = false;
    let promptTarget = null, lastPrompt, lastLocation, lastHud = '', lastHourSent = -1;
    let clock = 0, slowTick = 0, bubbleTick = 3, raf = 0, last = performance.now();
    const tmpColor = new THREE.Color(), grayColor = new THREE.Color(), v3 = new THREE.Vector3();

    function placeCitizen(c) {
        const side = Math.floor(c.p / 31) % 4, u = c.p % 31, e = 15.5;
        const [lx, lz, hx, hz] = side === 0 ? [-e + u, -e, 1, 0] : side === 1 ? [e, -e + u, 0, 1] : side === 2 ? [e - u, e, -1, 0] : [-e, e - u, 0, -1];
        c.x = c.block.cx + lx; c.z = c.block.cz + lz;
        c.mesh.position.set(c.x, PAD_H, c.z);
        if (chattingId !== c.id) c.mesh.rotation.y = Math.atan2(hx * c.dir, hz * c.dir);
    }

    function nearest() {
        if (mode !== 'foot') return null;
        let best = null, bd = Infinity;
        const consider = (target, x, z, max, y = 0) => {
            const d = Math.hypot(player.x - x, player.z - z);
            if (d < max && d < bd && Math.abs(player.y - y) < 2.5) { bd = d; best = target; }
        };
        for (const c of cars) consider({ type: 'car', ref: c, text: 'כניסה לרכב' }, c.x, c.z, 4);
        consider({ type: 'heli', ref: heli, text: 'עלייה למסוק' }, heli.x, heli.z, 5, heli.y);
        for (const c of citizens) consider({ type: 'citizen', ref: c, text: `שיחה עם ${c.name}` }, c.x, c.z, 3, PAD_H);
        return best;
    }

    function interact() {
        if (!started) return;
        if (mode === 'car') {
            const c = vehicle;
            const out = resolveSolids(world, c.x - Math.cos(c.yaw) * 2.3, c.z + Math.sin(c.yaw) * 2.3, 0, 0.4);
            Object.assign(player, { x: out.x, z: out.z, y: groundAt(world, out.x, out.z, 1), vy: 0 });
            c.speed = 0; mode = 'foot'; vehicle = null; player.mesh.visible = true;
            return;
        }
        if (mode === 'heli') {
            if (heli.y - groundAt(world, heli.x, heli.z, heli.y) > 0.4) return;
            Object.assign(player, { x: heli.x - Math.cos(heli.yaw) * 2.6, z: heli.z + Math.sin(heli.yaw) * 2.6, y: heli.y, vy: 0 });
            mode = 'foot'; vehicle = null; player.mesh.visible = true;
            return;
        }
        const t = nearest();
        if (!t) return;
        if (t.type === 'citizen') { cb.onChat?.({ id: t.ref.id, name: t.ref.name, role: t.ref.role }); return; }
        mode = t.type; vehicle = t.ref; player.mesh.visible = false;
    }

    function readInput() {
        let mx = input.mx, my = input.my;
        if (keys.has('KeyW') || keys.has('ArrowUp')) my += 1;
        if (keys.has('KeyS') || keys.has('ArrowDown')) my -= 1;
        if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
        if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
        const len = Math.hypot(mx, my);
        if (len > 1) { mx /= len; my /= len; }
        return {
            mx, my,
            jump: input.jump || keys.has('Space'),
            down: input.down || keys.has('ShiftLeft') || keys.has('ShiftRight'),
            run: keys.has('ShiftLeft') || keys.has('ShiftRight')
        };
    }

    function updateFoot(dt, i) {
        const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
        const dx = fx * i.my + Math.cos(cam.yaw) * i.mx;
        const dz = fz * i.my - Math.sin(cam.yaw) * i.mx;
        const moving = Math.hypot(dx, dz) > 0.05;
        const speed = i.run ? 10.5 : 6.2;
        const wasGrounded = player.grounded;
        let nx = player.x + dx * speed * dt, nz = player.z + dz * speed * dt;
        const out = resolveSolids(world, nx, nz, player.y, 0.35);
        nx = clamp(out.x, -HALF - 70, HALF + 70); nz = clamp(out.z, -HALF - 70, HALF + 70);
        if (i.jump && player.grounded) { player.vy = 8.6; player.grounded = false; }
        player.vy -= 25 * dt;
        let ny = player.y + player.vy * dt;
        const g = groundAt(world, nx, nz, Math.max(player.y, ny));
        if (ny <= g) { ny = g; player.vy = 0; player.grounded = true; }
        else if (wasGrounded && player.vy <= 0 && ny - g < 0.75) { ny = g; player.vy = 0; player.grounded = true; }
        else player.grounded = false;
        player.x = nx; player.y = ny; player.z = nz;
        if (moving) {
            player.heading = angleLerp(player.heading, Math.atan2(dx, dz), Math.min(1, dt * 12));
            player.phase += dt * (i.run ? 14 : 9.5);
        }
        swingHuman(player.mesh, player.phase, moving && player.grounded ? 0.75 : player.grounded ? 0 : 0.35);
        player.mesh.position.set(player.x, player.y, player.z);
        player.mesh.rotation.y = player.heading;
    }

    function updateCar(dt, i) {
        const c = vehicle;
        if (i.my > 0) c.speed += 15 * i.my * dt;
        else if (i.my < 0) c.speed += (c.speed > 0 ? 30 : 9) * i.my * dt;
        c.speed -= c.speed * 0.6 * dt;
        if (Math.abs(i.my) < 0.05 && Math.abs(c.speed) < 0.3) c.speed = 0;
        c.speed = clamp(c.speed, -8, 27);
        c.yaw -= i.mx * 1.9 * dt * clamp(c.speed / 5, -1, 1);
        const nx = c.x + Math.sin(c.yaw) * c.speed * dt, nz = c.z + Math.cos(c.yaw) * c.speed * dt;
        const out = resolveSolids(world, nx, nz, 0, 1.5);
        if (out.hit) c.speed *= -0.25;
        c.x = clamp(out.x, -HALF - 70, HALF + 70); c.z = clamp(out.z, -HALF - 70, HALF + 70);
        player.x = c.x; player.z = c.z; player.y = 0;
    }

    function updateHeli(dt, i) {
        const h = heli;
        const g = groundAt(world, h.x, h.z, h.y);
        const airborne = h.y - g > 0.05;
        h.vy += ((i.jump ? 9 : i.down ? -9 : 0) - h.vy) * Math.min(1, dt * 2.5);
        if (airborne) {
            h.yaw -= i.mx * 1.5 * dt;
            const sp = i.my * (i.my > 0 ? 20 : 8);
            const out = resolveSolids(world, h.x + Math.sin(h.yaw) * sp * dt, h.z + Math.cos(h.yaw) * sp * dt, h.y, 2.4);
            h.x = clamp(out.x, -HALF - 120, HALF + 120); h.z = clamp(out.z, -HALF - 120, HALF + 120);
            h.mesh.rotation.x = angleLerp(h.mesh.rotation.x, i.my * 0.16, dt * 3);
        } else h.mesh.rotation.x = 0;
        h.y = clamp(h.y + h.vy * dt, groundAt(world, h.x, h.z, h.y), 140);
        if (h.y <= g && h.vy < 0) h.vy = 0;
        player.x = h.x; player.y = h.y; player.z = h.z;
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

        const isDay = elev > -0.05, s = isDay ? 1 : -1;
        v3.set(Math.cos(a) * s, Math.max(0.12, Math.abs(elev)), 0.38).normalize();
        sun.color.set(isDay ? (elev < 0.3 ? '#ffc48a' : '#fff1d6') : '#8fa8d8');
        sun.intensity = isDay ? 2.7 * day * w.dim : 0.32 * w.dim;
        sun.target.position.set(player.x, player.y, player.z);
        sun.position.copy(sun.target.position).addScaledVector(v3, 150);
        hemi.intensity = (0.22 + 0.95 * day) * (0.55 + 0.45 * w.dim);
        orb.position.copy(camera.position).addScaledVector(v3, 1250);
        orb.material.color.set(isDay ? '#fff3d0' : '#dfe6f2');
        orb.scale.setScalar(isDay ? 1 : 0.7);
        orb.visible = w.mix < 0.8;
        stars.position.copy(camera.position);
        stars.material.opacity = (1 - day) * w.stars;

        const night = 1 - day;
        for (const m of glowMats) m.emissiveIntensity = night * 1.15;
        bulbMat.emissiveIntensity = night * 2.4;
        beaconMat.emissiveIntensity = 0.35 + night * 1.6;
        beacon.rotation.y += dt * 0.8;

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

    function updateCamera(dt) {
        let tx, ty, tz;
        if (!started) {
            cam.yaw += dt * 0.07;
            tx = 0; ty = 6; tz = 0;
            cam.dist += (64 - cam.dist) * Math.min(1, dt * 2);
        } else {
            tx = player.x; ty = player.y + (mode === 'foot' ? 1.55 : 1.9); tz = player.z;
            const want = mode === 'foot' ? 0 : mode === 'car' ? 12 : 17;
            if (want && Math.abs(vehicle.speed ?? 2) > 1 && clock - cam.lastDrag > 1.8) cam.yaw = angleLerp(cam.yaw, vehicle.yaw + Math.PI, Math.min(1, dt * 2.2));
        }
        const f = Math.min(1, dt * 10);
        cam.tx += (tx - cam.tx) * f; cam.ty += (ty - cam.ty) * f; cam.tz += (tz - cam.tz) * f;
        const d = started ? cam.dist * (mode === 'heli' ? 1.6 : mode === 'car' ? 1.15 : 1) : cam.dist;
        const cp = Math.cos(cam.pitch);
        camera.position.set(cam.tx + d * cp * Math.sin(cam.yaw), Math.max(0.6, cam.ty + d * Math.sin(cam.pitch)), cam.tz + d * cp * Math.cos(cam.yaw));
        camera.lookAt(cam.tx, cam.ty, cam.tz);
    }

    function report() {
        const target = nearest();
        promptTarget = target;
        const landed = mode === 'heli' && heli.y - groundAt(world, heli.x, heli.z, heli.y) < 0.4;
        const text = !started || chattingId !== null ? null : mode === 'car' ? 'יציאה מהרכב' : mode === 'heli' ? (landed ? 'ירידה מהמסוק' : null) : target?.text || null;
        if (text !== lastPrompt) { lastPrompt = text; cb.onPrompt?.(text); }
        const where = locate(world, player.x, player.y, player.z);
        if (where !== lastLocation) { lastLocation = where; cb.onLocation?.(where); }
        const hud = mode === 'car' ? { mode, speed: Math.round(Math.abs(vehicle.speed) * 3.6) }
            : mode === 'heli' ? { mode, alt: Math.round(heli.y), floors: Math.round(heli.y / FLOOR) } : null;
        const key = JSON.stringify(hud);
        if (key !== lastHud) { lastHud = key; cb.onHud?.(hud); }
        const shown = Math.round(env.hour * 12);
        if (shown !== lastHourSent) { lastHourSent = shown; cb.onHour?.(env.hour); }
    }

    function frame(now) {
        if (disposed) return;
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now; clock += dt;
        if (started && chattingId === null) {
            const i = readInput();
            if (mode === 'foot') updateFoot(dt, i);
            else if (mode === 'car') updateCar(dt, i);
            else updateHeli(dt, i);
        }
        for (const c of cars) { c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.yaw; }
        heli.spin += ((mode === 'heli' ? 26 : 0) - heli.spin) * Math.min(1, dt * 1.2);
        heli.mesh.userData.rotor.rotation.y += heli.spin * dt;
        heli.mesh.position.set(heli.x, heli.y, heli.z); heli.mesh.rotation.y = heli.yaw;
        updateCamera(dt);
        updateCitizens(dt);
        updateEnvironment(dt);
        slowTick -= dt;
        if (slowTick <= 0) { slowTick = 0.2; report(); }
        renderer.render(scene, camera);
    }

    // --- events --------------------------------------------------------------
    const typing = (e) => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target?.tagName || '');
    const onKeyDown = (e) => {
        if (typing(e)) return;
        if (e.code === 'KeyE' && !e.repeat) interact();
        if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
        keys.add(e.code);
    };
    const onKeyUp = (e) => keys.delete(e.code);
    const onBlur = () => keys.clear();
    const canvas = renderer.domElement;
    let dragId = null, px = 0, py = 0;
    const onDown = (e) => { dragId = e.pointerId; px = e.clientX; py = e.clientY; canvas.setPointerCapture(e.pointerId); };
    const onMove = (e) => {
        if (e.pointerId !== dragId) return;
        cam.yaw -= (e.clientX - px) * 0.0052;
        cam.pitch = clamp(cam.pitch + (e.clientY - py) * 0.004, 0.04, 1.35);
        px = e.clientX; py = e.clientY; cam.lastDrag = clock;
    };
    const onUp = (e) => { if (e.pointerId === dragId) dragId = null; };
    const onWheel = (e) => { e.preventDefault(); cam.dist = clamp(cam.dist * (e.deltaY > 0 ? 1.1 : 0.9), 4, 42); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    const resize = () => {
        const w = container.clientWidth || 1, h = container.clientHeight || 1;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    citizens.forEach(placeCitizen);
    raf = requestAnimationFrame(frame);

    return {
        start() { started = true; cam.dist = 11; cam.yaw = 0; cam.pitch = 0.36; },
        interact,
        setMove(x, y) { input.mx = x; input.my = y; },
        setJump(v) { input.jump = v; },
        setDown(v) { input.down = v; },
        setWeather(v) { if (WEATHER[v]) env.weather = v; },
        setHour(v) { env.hour = clamp(v, 0, 23.99); },
        setCycle(v) { env.cycle = v; },
        setChat(id) { chattingId = id; },
        /** Read-only snapshot, used by tests and debugging. */
        snapshot: () => ({ mode, started, hour: env.hour, player: { x: player.x, y: player.y, z: player.z }, prompt: promptTarget?.type || null }),
        dispose() {
            disposed = true;
            cancelAnimationFrame(raf);
            observer.disconnect();
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
            scene.traverse((o) => {
                o.geometry?.dispose();
                for (const m of [].concat(o.material || [])) {
                    m.map?.dispose(); m.emissiveMap?.dispose(); m.dispose();
                }
            });
            textures.forEach((t) => { t.wall.dispose(); t.glow.dispose(); });
            renderer.dispose();
            canvas.remove();
            bubbleLayer.replaceChildren();
        }
    };
}
