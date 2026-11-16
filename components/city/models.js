// Meshes and procedural textures: people, weapons, cars, boats, the helicopter.
import * as THREE from 'three';
import { WEAPONS } from './combat.js';
import { rng } from './world.js';

const mat = (color, extra) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });

function put(parent, geo, material, x, y, z, shadow = true) {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    parent.add(mesh);
    return mesh;
}

/** Facade texture (windows) and the matching night-time glow map. */
export function windowTextures(seed) {
    const r = rng(seed);
    const make = () => { const c = document.createElement('canvas'); c.width = c.height = 512; return c; };
    const wall = make(), glow = make();
    const w = wall.getContext('2d'), g = glow.getContext('2d');
    w.fillStyle = '#ffffff'; w.fillRect(0, 0, 512, 512);
    g.fillStyle = '#000000'; g.fillRect(0, 0, 512, 512);
    for (let cy = 0; cy < 8; cy++) {
        // A thin shadow line under every floor gives the facade some depth.
        w.fillStyle = 'rgba(40,40,40,0.16)'; w.fillRect(0, cy * 64 + 60, 512, 4);
        for (let cx = 0; cx < 8; cx++) {
            const x = cx * 64 + 14, y = cy * 64 + 11;
            w.fillStyle = '#4d5b66'; w.fillRect(x - 2, y - 2, 40, 44);
            const grad = w.createLinearGradient(x, y, x + 36, y + 40);
            grad.addColorStop(0, '#93a9b8'); grad.addColorStop(0.5, '#5f7482'); grad.addColorStop(1, '#7d93a2');
            w.fillStyle = grad; w.fillRect(x, y, 36, 40);
            w.fillStyle = '#4d5b66'; w.fillRect(x + 17, y, 2, 40);
            w.fillStyle = '#d8d2c6'; w.fillRect(x - 3, y + 42, 42, 3);
            if (r() < 0.5) {
                const v = 150 + Math.floor(r() * 105);
                g.fillStyle = `rgb(${v},${Math.floor(v * 0.82)},${Math.floor(v * 0.55)})`;
                g.fillRect(x, y, 36, 40);
            }
        }
    }
    const tex = (c) => {
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        return t;
    };
    return { wall: tex(wall), glow: tex(glow) };
}

/** Tileable ripple normal map for the sea. */
export function waterNormals() {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    const k = (Math.PI * 2) / size;
    const height = (x, y) => Math.sin(x * k * 3 + y * k) + Math.sin(y * k * 5 - x * k * 2) * 0.6 + Math.sin((x + y) * k * 7) * 0.35;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const dx = height(x + 1, y) - height(x - 1, y), dy = height(x, y + 1) - height(x, y - 1);
        const n = new THREE.Vector3(-dx * 1.4, -dy * 1.4, 1).normalize();
        img.data.set([(n.x * 0.5 + 0.5) * 255, (n.y * 0.5 + 0.5) * 255, (n.z * 0.5 + 0.5) * 255, 255], (y * size + x) * 4);
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
}

export function instancedBoxes(list, material, shadow = true) {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, list.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    list.forEach((b, n) => {
        m.compose(new THREE.Vector3(b.x, b.y, b.z), q, new THREE.Vector3(b.sx, b.sy, b.sz));
        mesh.setMatrixAt(n, m);
        if (b.color) mesh.setColorAt(n, c.set(b.color));
    });
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    return mesh;
}

export function makeGun(id) {
    const w = WEAPONS[id];
    const g = new THREE.Group();
    const metal = mat(w.color, { metalness: 0.7, roughness: 0.35 });
    const dark = mat('#17191c', { metalness: 0.5, roughness: 0.5 });
    put(g, new THREE.BoxGeometry(0.07, 0.1, w.len), metal, 0, 0, w.len / 2, false);
    put(g, new THREE.BoxGeometry(0.06, 0.16, 0.08), dark, 0, -0.11, 0.06, false);
    put(g, new THREE.CylinderGeometry(0.018, 0.018, w.len * 0.5, 8), dark, 0, 0.02, w.len * 1.05, false).rotation.x = Math.PI / 2;
    if (id !== 'pistol') put(g, new THREE.BoxGeometry(0.06, 0.09, 0.3), dark, 0, -0.02, -0.14, false);
    if (id === 'smg' || id === 'rifle') put(g, new THREE.BoxGeometry(0.05, 0.2, 0.07), dark, 0, -0.14, w.len * 0.45, false);
    if (id === 'sniper') put(g, new THREE.CylinderGeometry(0.03, 0.03, 0.3, 10), dark, 0, 0.1, w.len * 0.4, false).rotation.x = Math.PI / 2;
    // The arm hangs along -y; turned this way the barrel runs along the arm.
    g.rotation.x = Math.PI / 2;
    g.position.set(0, -0.6, 0.06);
    return g;
}

export function makeHuman({ shirt, pants, hair = '#2a1f18', vest = null, skinTone = '#e2b594', hat = null }) {
    const g = new THREE.Group();
    const skin = mat(skinTone);
    const shirtMat = mat(shirt), legMat = mat(pants);
    const torso = put(g, new THREE.CapsuleGeometry(0.2, 0.34, 6, 12), shirtMat, 0, 1.18, 0);
    torso.scale.set(1.28, 1, 0.82);
    if (vest) put(g, new THREE.BoxGeometry(0.5, 0.42, 0.34), mat(vest, { roughness: 0.6 }), 0, 1.2, 0);
    put(g, new THREE.CylinderGeometry(0.06, 0.07, 0.1, 10), skin, 0, 1.5, 0);
    put(g, new THREE.SphereGeometry(0.17, 20, 16), skin, 0, 1.67, 0);
    put(g, new THREE.SphereGeometry(0.182, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(hair), 0, 1.69, -0.012);
    if (hat) {
        const capMat = mat(hat, { roughness: 0.6 });
        put(g, new THREE.CylinderGeometry(0.19, 0.2, 0.12, 18), capMat, 0, 1.82, 0);
        put(g, new THREE.BoxGeometry(0.3, 0.025, 0.16), capMat, 0, 1.765, 0.18);
        put(g, new THREE.BoxGeometry(0.08, 0.06, 0.02), mat('#dfc184', { metalness: 0.8, roughness: 0.3 }), 0, 1.83, 0.19, false);
    }
    const limb = (rad, len, material, x, y, foot) => {
        const pivot = new THREE.Group();
        pivot.position.set(x, y, 0);
        put(pivot, new THREE.CapsuleGeometry(rad, len - rad * 2, 4, 10), material, 0, -len / 2, 0);
        if (foot) put(pivot, new THREE.BoxGeometry(0.16, 0.09, 0.3), mat('#1d1f22'), 0, -len + 0.02, 0.06);
        else put(pivot, new THREE.SphereGeometry(rad * 1.05, 10, 8), skin, 0, -len, 0);
        g.add(pivot);
        return pivot;
    };
    g.userData.parts = {
        legL: limb(0.095, 0.86, legMat, -0.12, 0.88, true), legR: limb(0.095, 0.86, legMat, 0.12, 0.88, true),
        armL: limb(0.07, 0.6, shirtMat, -0.33, 1.46, false), armR: limb(0.07, 0.6, shirtMat, 0.33, 1.46, false)
    };
    return g;
}

export function setGun(human, id) {
    const arm = human.userData.parts.armR;
    if (human.userData.gun) arm.remove(human.userData.gun);
    human.userData.gun = id ? makeGun(id) : null;
    if (human.userData.gun) arm.add(human.userData.gun);
}

/** Walk cycle; with `armed` the right arm stays raised, holding the weapon level. */
export function swingHuman(group, phase, amp, armed = false) {
    const p = group.userData.parts, s = Math.sin(phase) * amp;
    p.legL.rotation.x = s; p.legR.rotation.x = -s;
    p.armL.rotation.x = -s * 0.8;
    p.armR.rotation.x = armed ? -Math.PI / 2 + 0.08 : s * 0.8;
}

const CAR_SHAPES = {
    basic: { w: 1.9, l: 4.2, body: 0.55, cab: 0.55, ride: 0.34, wheel: 0.36 },
    sport: { w: 2, l: 4.5, body: 0.42, cab: 0.4, ride: 0.26, wheel: 0.36, spoiler: true },
    jeep: { w: 2.15, l: 4.5, body: 0.8, cab: 0.62, ride: 0.52, wheel: 0.5, rack: true },
    super: { w: 2.1, l: 4.7, body: 0.36, cab: 0.34, ride: 0.22, wheel: 0.37, spoiler: true },
    police: { w: 1.95, l: 4.5, body: 0.58, cab: 0.56, ride: 0.34, wheel: 0.37, police: true }
};

export function makeCar(type, color) {
    const s = CAR_SHAPES[type];
    const g = new THREE.Group();
    const paint = new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.12 });
    const glass = mat('#16242e', { roughness: 0.08, metalness: 0.85 });
    const trim = mat('#15171a', { roughness: 0.6 });
    const tyre = mat('#141516', { roughness: 0.95 });
    const rim = mat('#b9bec4', { metalness: 0.9, roughness: 0.25 });
    const head = new THREE.MeshStandardMaterial({ color: '#fff3c9', emissive: '#ffe9a8', emissiveIntensity: 2 });
    const tail = new THREE.MeshStandardMaterial({ color: '#7a1414', emissive: '#ff2a1c', emissiveIntensity: 1.3 });
    const by = s.ride + s.body / 2;
    put(g, new THREE.BoxGeometry(s.w, s.body, s.l), paint, 0, by, 0);
    put(g, new THREE.BoxGeometry(s.w * 0.96, s.body * 0.5, s.l * 0.2), paint, 0, by - s.body * 0.1, s.l * 0.42).rotation.x = 0.25;
    const cabL = s.l * 0.5, cy = s.ride + s.body + s.cab / 2;
    put(g, new THREE.BoxGeometry(s.w * 0.86, s.cab, cabL), glass, 0, cy, -s.l * 0.06);
    put(g, new THREE.BoxGeometry(s.w * 0.88, 0.06, cabL * 0.82), paint, 0, cy + s.cab / 2 + 0.02, -s.l * 0.06);
    for (const x of [-1, 1]) for (const z of [-0.36, 0.3]) put(g, new THREE.BoxGeometry(0.07, s.cab, 0.09), paint, x * s.w * 0.43, cy, -s.l * 0.06 + z * cabL);
    put(g, new THREE.BoxGeometry(s.w * 1.02, 0.16, 0.16), trim, 0, s.ride + 0.1, s.l / 2);
    put(g, new THREE.BoxGeometry(s.w * 1.02, 0.16, 0.16), trim, 0, s.ride + 0.1, -s.l / 2);
    const wheel = new THREE.CylinderGeometry(s.wheel, s.wheel, 0.28, 20);
    const hub = new THREE.CylinderGeometry(s.wheel * 0.55, s.wheel * 0.55, 0.3, 12);
    for (const x of [-1, 1]) for (const z of [-0.32, 0.32]) {
        put(g, wheel, tyre, x * s.w * 0.5, s.wheel, z * s.l).rotation.z = Math.PI / 2;
        put(g, hub, rim, x * s.w * 0.5, s.wheel, z * s.l, false).rotation.z = Math.PI / 2;
    }
    for (const x of [-1, 1]) {
        put(g, new THREE.BoxGeometry(0.42, 0.15, 0.06), head, x * s.w * 0.32, by + s.body * 0.15, s.l / 2 + 0.01, false);
        put(g, new THREE.BoxGeometry(0.42, 0.13, 0.06), tail, x * s.w * 0.32, by + s.body * 0.15, -s.l / 2 - 0.01, false);
    }
    if (s.spoiler) {
        put(g, new THREE.BoxGeometry(s.w * 0.9, 0.05, 0.34), trim, 0, by + s.body / 2 + 0.3, -s.l * 0.45);
        for (const x of [-1, 1]) put(g, new THREE.BoxGeometry(0.05, 0.3, 0.08), trim, x * s.w * 0.36, by + s.body / 2 + 0.15, -s.l * 0.45);
    }
    if (s.police) {
        const blue = mat('#1f4fa8', { roughness: 0.4 });
        for (const x of [-1, 1]) put(g, new THREE.BoxGeometry(0.02, 0.16, s.l * 0.9), blue, x * (s.w / 2 + 0.01), by, 0, false);
        put(g, new THREE.BoxGeometry(s.w * 1.02, 0.02, s.l * 0.25), blue, 0, by + s.body / 2 + 0.01, s.l * 0.33, false);
        const red = new THREE.MeshStandardMaterial({ color: '#5a0d0d', emissive: '#ff2418', emissiveIntensity: 0 });
        const blueLight = new THREE.MeshStandardMaterial({ color: '#0d1f5a', emissive: '#2a62ff', emissiveIntensity: 0 });
        const barY = cy + s.cab / 2 + 0.12;
        put(g, new THREE.BoxGeometry(s.w * 0.7, 0.08, 0.32), mat('#202326'), 0, barY - 0.06, -s.l * 0.06, false);
        put(g, new THREE.BoxGeometry(s.w * 0.32, 0.13, 0.3), red, -s.w * 0.18, barY + 0.04, -s.l * 0.06, false);
        put(g, new THREE.BoxGeometry(s.w * 0.32, 0.13, 0.3), blueLight, s.w * 0.18, barY + 0.04, -s.l * 0.06, false);
        g.userData.lights = [red, blueLight];
    }
    if (s.rack) {
        put(g, new THREE.BoxGeometry(s.w * 0.8, 0.06, cabL * 0.7), trim, 0, cy + s.cab / 2 + 0.14, -s.l * 0.06);
        put(g, new THREE.BoxGeometry(s.w * 1.08, 0.18, 0.2), trim, 0, s.ride + 0.25, s.l / 2 + 0.08);
    }
    return g;
}

export function makeBoat(type, color) {
    const fast = type === 'speed';
    const g = new THREE.Group();
    const len = fast ? 6.4 : 5.2, wid = fast ? 2 : 2.2;
    const shape = new THREE.Shape();
    shape.moveTo(-wid / 2, -len / 2);
    shape.lineTo(wid / 2, -len / 2);
    shape.lineTo(wid / 2, len * 0.15);
    shape.quadraticCurveTo(wid * 0.42, len * 0.4, 0, len / 2);
    shape.quadraticCurveTo(-wid * 0.42, len * 0.4, -wid / 2, len * 0.15);
    shape.closePath();
    const hullGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.75, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 });
    hullGeo.rotateX(Math.PI / 2); // shape y becomes z; the hull hangs below the deck
    const hull = new THREE.Mesh(hullGeo, new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, metalness: 0.3, clearcoat: 0.8 }));
    hull.position.y = 0.55;
    hull.castShadow = true;
    g.add(hull);
    const deckGeo = new THREE.ShapeGeometry(shape);
    deckGeo.rotateX(Math.PI / 2);
    const deck = new THREE.Mesh(deckGeo, mat('#b08a5a', { side: THREE.DoubleSide }));
    deck.position.y = 0.58;
    g.add(deck);
    const dark = mat('#1b2630', { roughness: 0.15, metalness: 0.8 });
    put(g, new THREE.BoxGeometry(wid * 0.7, 0.5, 0.08), dark, 0, 0.92, fast ? 0.5 : 0.3).rotation.x = -0.5;
    put(g, new THREE.BoxGeometry(wid * 0.6, 0.3, 0.9), mat('#e9e3d6'), 0, 0.72, -0.5);
    put(g, new THREE.BoxGeometry(0.5, 0.7, 0.45), mat('#22262a', { metalness: 0.6 }), 0, 0.6, -len / 2 - 0.15);
    if (fast) put(g, new THREE.BoxGeometry(wid * 0.9, 0.06, 0.4), mat('#dfc184', { metalness: 0.7, roughness: 0.3 }), 0, 1.25, -len * 0.3);
    return g;
}

export function makeHeli() {
    const g = new THREE.Group();
    const body = new THREE.MeshPhysicalMaterial({ color: '#dfc184', roughness: 0.3, metalness: 0.5, clearcoat: 1 });
    const dark = mat('#17242e', { roughness: 0.15, metalness: 0.8 });
    put(g, new THREE.SphereGeometry(1, 28, 20), body, 0, 1.35, 0).scale.set(1.1, 1, 1.9);
    put(g, new THREE.SphereGeometry(0.82, 24, 16), dark, 0, 1.5, 0.95).scale.set(1.05, 0.8, 1);
    put(g, new THREE.CylinderGeometry(0.1, 0.22, 3.4, 12), body, 0, 1.55, -3).rotation.x = Math.PI / 2;
    put(g, new THREE.BoxGeometry(0.08, 0.95, 0.6), body, 0, 1.95, -4.5);
    const tailRotor = put(g, new THREE.BoxGeometry(0.04, 1.1, 0.12), dark, 0.12, 1.95, -4.6);
    for (const x of [-0.85, 0.85]) {
        put(g, new THREE.CylinderGeometry(0.05, 0.05, 3, 8), dark, x, 0.08, 0).rotation.x = Math.PI / 2;
        for (const z of [-0.8, 0.8]) put(g, new THREE.CylinderGeometry(0.035, 0.035, 0.5, 6), dark, x, 0.33, z);
    }
    put(g, new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8), dark, 0, 2.5, 0);
    const rotor = new THREE.Group();
    rotor.position.y = 2.72;
    put(rotor, new THREE.BoxGeometry(7.4, 0.05, 0.3), dark, 0, 0, 0);
    put(rotor, new THREE.BoxGeometry(0.3, 0.05, 7.4), dark, 0, 0, 0);
    g.add(rotor);
    g.userData.rotor = rotor;
    g.userData.tailRotor = tailRotor;
    return g;
}

/** A safe: steel body, a door on a hinge (userData.door) and a gold dial. */
export function makeSafe() {
    const g = new THREE.Group();
    const steel = mat('#2c3238', { metalness: 0.85, roughness: 0.35 });
    put(g, new THREE.BoxGeometry(0.9, 1.1, 0.9), steel, 0, 0.55, 0);
    const hinge = new THREE.Group();
    hinge.position.set(-0.42, 0, 0.46);
    put(hinge, new THREE.BoxGeometry(0.84, 1.0, 0.06), mat('#3a424a', { metalness: 0.9, roughness: 0.3 }), 0.42, 0.55, 0);
    const dial = put(hinge, new THREE.CylinderGeometry(0.11, 0.11, 0.05, 20), mat('#dfc184', { metalness: 0.9, roughness: 0.25 }), 0.52, 0.6, 0.05, false);
    dial.rotation.x = Math.PI / 2;
    put(hinge, new THREE.BoxGeometry(0.06, 0.24, 0.05), mat('#dfc184', { metalness: 0.9, roughness: 0.25 }), 0.22, 0.6, 0.05, false);
    g.add(hinge);
    // Stacks of cash inside, seen once the door swings open.
    for (let n = 0; n < 3; n++) put(g, new THREE.BoxGeometry(0.3, 0.12, 0.18), mat('#5f9a5a'), -0.15 + (n % 2) * 0.3, 0.3 + Math.floor(n / 2) * 0.14, 0.1, false);
    g.userData.door = hinge;
    g.userData.dial = dial;
    return g;
}

/** A shop sign with the business name, drawn right to left. */
export function makeSign(text, color) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0c1820'; ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = color; ctx.fillRect(0, 0, 512, 10); ctx.fillRect(0, 118, 512, 10);
    ctx.fillStyle = '#f3e4c4';
    ctx.font = '700 60px Rubik, Heebo, Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
    ctx.fillText(text, 256, 66, 480);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.3), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.5 }));
    return sign;
}

/** A cargo ship: long hull, bridge and funnel at the stern, containers on deck. */
export function makeShip(color) {
    const g = new THREE.Group();
    const len = 26, wid = 7;
    const shape = new THREE.Shape();
    shape.moveTo(-wid / 2, -len / 2);
    shape.lineTo(wid / 2, -len / 2);
    shape.lineTo(wid / 2, len * 0.22);
    shape.quadraticCurveTo(wid * 0.4, len * 0.42, 0, len / 2);
    shape.quadraticCurveTo(-wid * 0.4, len * 0.42, -wid / 2, len * 0.22);
    shape.closePath();
    const hullGeo = new THREE.ExtrudeGeometry(shape, { depth: 3.2, bevelEnabled: false });
    hullGeo.rotateX(Math.PI / 2);
    const hull = new THREE.Mesh(hullGeo, new THREE.MeshPhysicalMaterial({ color, roughness: 0.45, metalness: 0.4, clearcoat: 0.4 }));
    hull.position.y = 2.2;
    hull.castShadow = true;
    g.add(hull);
    const deckGeo = new THREE.ShapeGeometry(shape);
    deckGeo.rotateX(Math.PI / 2);
    const deck = new THREE.Mesh(deckGeo, mat('#8c8f8a', { side: THREE.DoubleSide }));
    deck.position.y = 2.22;
    g.add(deck);
    const white = mat('#ecebe4', { roughness: 0.5 });
    const glass = mat('#16242e', { roughness: 0.1, metalness: 0.8 });
    put(g, new THREE.BoxGeometry(5.6, 2.6, 5), white, 0, 3.5, -8.5);
    put(g, new THREE.BoxGeometry(5, 2, 3.6), white, 0, 5.8, -8.8);
    put(g, new THREE.BoxGeometry(5.05, 0.8, 0.1), glass, 0, 6.1, -6.97, false);
    put(g, new THREE.BoxGeometry(5.65, 0.6, 0.1), glass, 0, 3.9, -5.97, false);
    put(g, new THREE.CylinderGeometry(0.7, 0.9, 2.6, 16), mat('#dfc184', { metalness: 0.6, roughness: 0.4 }), 0, 8.1, -9.6);
    put(g, new THREE.CylinderGeometry(0.72, 0.72, 0.5, 16), mat('#22262a'), 0, 9.2, -9.6);
    put(g, new THREE.CylinderGeometry(0.06, 0.08, 4, 8), mat('#3b4348'), 0, 4.2, 9.5);
    const colors = ['#b8443a', '#3d6f9e', '#d9b44a', '#4f8a5b', '#d97b3a'];
    for (let n = 0; n < 9; n++) put(g, new THREE.BoxGeometry(1.9, 1.5, 3.8), mat(colors[n % 5], { roughness: 0.7 }), ((n % 3) - 1) * 2.05, 3, -2.5 + Math.floor(n / 3) * 4.1);
    for (let n = 0; n < 3; n++) put(g, new THREE.BoxGeometry(1.9, 1.5, 3.8), mat(colors[(n + 2) % 5], { roughness: 0.7 }), (n - 1) * 2.05, 4.55, -2.5 + (n % 2) * 4.1);
    return g;
}
