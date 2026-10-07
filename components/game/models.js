import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Low-poly models built from primitives, so the game ships with no asset files.

const geoCache = new Map();
const matCache = new Map();

export function boxGeo(w, h, d) {
    const key = `${w}|${h}|${d}`;
    if (!geoCache.has(key)) geoCache.set(key, new THREE.BoxGeometry(w, h, d));
    return geoCache.get(key);
}

export function lambert(color, emissive) {
    const key = `${color}|${emissive || ''}`;
    if (!matCache.has(key)) {
        const m = new THREE.MeshLambertMaterial({ color, flatShading: true });
        if (emissive) {
            m.emissive = new THREE.Color(emissive);
            m.emissiveIntensity = 0.6;
        }
        matCache.set(key, m);
    }
    return matCache.get(key);
}


// Builds a humanoid hero. The model faces -z with its feet at y = 0.
const rgeo = new Map();
function rpart(parent, w, h, d, color, x, y, z, o = {}) {
    const r = Math.max(0.002, Math.min(o.r ?? 0.02, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002));
    const key = `${w}|${h}|${d}|${r}`;
    if (!rgeo.has(key)) rgeo.set(key, new RoundedBoxGeometry(w, h, d, 2, r));
    const mk = `std|${color}|${o.glow || ''}|${o.metal || 0}`;
    if (!matCache.has(mk)) {
        const m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.45, metalness: o.metal ?? 0.3 });
        if (o.glow) {
            m.emissive = new THREE.Color(o.glow);
            m.emissiveIntensity = o.gi ?? 1.4;
        }
        matCache.set(mk, m);
    }
    const mesh = new THREE.Mesh(rgeo.get(key), matCache.get(mk));
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
}

// Detailed weapon models. The grip sits at the origin and the barrel points to -z.
export function makeWeaponMesh(type, rarityColor = '#a3a3a3', rarity = 0) {
    const g = new THREE.Group();
    const glow = rarity >= 3 ? rarityColor : null;
    const acc = { glow, gi: rarity >= 4 ? 1.6 : 0.9, metal: 0.5, rough: 0.35 };
    const dark = '#26292e';
    const steel = '#4b5058';
    if (type === 'pickaxe') {
        rpart(g, 0.06, 0.06, 0.95, '#6b4a2b', 0, 0, -0.3, { metal: 0, rough: 0.8 });
        rpart(g, 0.08, 0.08, 0.12, '#2a2a2e', 0, 0, 0.12, { metal: 0.2 });
        const head = rpart(g, 0.09, 0.62, 0.12, '#9ca3af', 0, 0, -0.74, { metal: 0.8, rough: 0.25 });
        head.rotation.x = 0.12;
        rpart(g, 0.06, 0.16, 0.08, '#d1d5db', 0, 0.36, -0.78, { metal: 0.9, rough: 0.2 });
        rpart(g, 0.06, 0.16, 0.08, '#d1d5db', 0, -0.36, -0.7, { metal: 0.9, rough: 0.2 });
        rpart(g, 0.11, 0.11, 0.14, '#38bdf8', 0, 0, -0.74, { glow: '#38bdf8', gi: 1.2 });
        return g;
    }
    if (type === 'pistol') {
        rpart(g, 0.07, 0.16, 0.1, dark, 0, -0.06, 0.02, { r: 0.025 });
        rpart(g, 0.075, 0.08, 0.32, steel, 0, 0.05, -0.1, { metal: 0.7 });
        rpart(g, 0.08, 0.025, 0.26, rarityColor, 0, 0.1, -0.1, acc);
        rpart(g, 0.03, 0.03, 0.05, '#111', 0, 0.06, -0.27);
        rpart(g, 0.05, 0.05, 0.08, dark, 0, -0.02, -0.06);
        return g;
    }
    const spec = {
        smg: { len: 0.55, body: dark, stock: 0.12, mag: 0.18, barrel: 0.18 },
        ar: { len: 0.72, body: '#3a3f3a', stock: 0.26, mag: 0.22, barrel: 0.28 },
        shotgun: { len: 0.7, body: '#6b4423', stock: 0.28, mag: 0, barrel: 0.32 },
        sniper: { len: 0.95, body: '#2f3b2f', stock: 0.3, mag: 0.12, barrel: 0.45 }
    }[type] || { len: 0.6, body: dark, stock: 0.2, mag: 0.18, barrel: 0.2 };
    const L = spec.len;
    rpart(g, 0.09, 0.15, L, spec.body, 0, 0.06, -L / 2 + 0.12, { metal: type === 'shotgun' ? 0 : 0.4, rough: type === 'shotgun' ? 0.7 : 0.4, r: 0.03 });
    rpart(g, 0.1, 0.04, L * 0.7, rarityColor, 0, 0.145, -L / 2 + 0.08, acc);
    rpart(g, 0.04, 0.04, spec.barrel, '#16181b', 0, 0.08, -L + 0.12 - spec.barrel / 2, { metal: 0.8 });
    rpart(g, 0.07, 0.17, 0.09, dark, 0, -0.08, 0.02, { r: 0.025 });
    rpart(g, 0.08, 0.13, spec.stock, spec.body, 0, 0.04, 0.12 + spec.stock / 2, { r: 0.03, metal: 0.2 });
    if (spec.mag) rpart(g, 0.06, spec.mag, 0.09, '#1c1f23', 0, -0.06 - spec.mag / 2 + 0.05, -L * 0.42, { metal: 0.5 });
    if (type === 'shotgun') rpart(g, 0.08, 0.06, 0.24, '#4a2f18', 0, 0.0, -L * 0.62, { metal: 0, rough: 0.8 });
    if (type === 'ar' || type === 'sniper') {
        rpart(g, 0.06, 0.06, type === 'sniper' ? 0.34 : 0.14, '#111317', 0, 0.2, -L * 0.42, { metal: 0.8, rough: 0.2 });
        rpart(g, 0.05, 0.05, 0.02, '#7dd3fc', 0, 0.2, -L * 0.42 - (type === 'sniper' ? 0.17 : 0.07), { glow: '#38bdf8', gi: 0.8 });
    }
    if (type === 'smg') rpart(g, 0.05, 0.1, 0.05, dark, 0, -0.03, -L * 0.7);
    return g;
}

export function makeAirship() {
    const g = new THREE.Group();
    const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.5, metalness: o.metal ?? 0.1, emissive: o.glow ? new THREE.Color(o.glow) : undefined, emissiveIntensity: o.gi ?? 1 });
    const balloon = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), std('#3b82f6', { rough: 0.35 }));
    balloon.scale.set(7, 6.2, 18);
    balloon.castShadow = true;
    g.add(balloon);
    for (const [y, c] of [[0, '#fbbf24'], [2.6, '#f8fafc'], [-2.6, '#f8fafc']]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 40), std(c));
        ring.scale.set(7.02 * Math.cos(Math.asin(y / 6.2)), 18.02 * Math.cos(Math.asin(y / 6.2)), 6);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = y;
        g.add(ring);
    }
    const gond = new THREE.Mesh(new RoundedBoxGeometry(5, 2.8, 10, 3, 0.6), std('#f8fafc'));
    gond.position.y = -7.4;
    gond.castShadow = true;
    g.add(gond);
    const trim = new THREE.Mesh(new RoundedBoxGeometry(5.2, 0.5, 10.2, 2, 0.2), std('#ef4444'));
    trim.position.y = -6.1;
    g.add(trim);
    for (let i = -3; i <= 3; i++) {
        for (const x of [-2.52, 2.52]) {
            const win = new THREE.Mesh(boxGeo(0.05, 0.9, 0.9), std('#fde68a', { glow: '#fbbf24', gi: 0.8 }));
            win.position.set(x, -7.5, i * 1.3);
            g.add(win);
        }
    }
    for (const x of [-1.8, 1.8]) {
        for (const z of [-3.5, 3.5]) {
            const rope = new THREE.Mesh(boxGeo(0.08, 1.8, 0.08), lambert('#334155'));
            rope.position.set(x, -5.3, z);
            g.add(rope);
        }
    }
    const finMat = std('#ef4444');
    for (const [x, y, sx, sy] of [[0, 4.5, 0.4, 5], [0, -4.5, 0.4, 5], [4.5, 0, 5, 0.4], [-4.5, 0, 5, 0.4]]) {
        const fin = new THREE.Mesh(new RoundedBoxGeometry(sx, sy, 5, 2, 0.15), finMat);
        fin.position.set(x, y, 15.5);
        g.add(fin);
    }
    const hub = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.6, 12), std('#334155', { metal: 0.6 }));
    hub.rotation.x = Math.PI / 2;
    hub.position.z = 18.6;
    g.add(hub);
    const prop = new THREE.Group();
    prop.position.z = 19.3;
    for (let i = 0; i < 3; i++) {
        const blade = new THREE.Mesh(boxGeo(0.5, 3.2, 0.12), std('#cbd5e1', { metal: 0.7 }));
        blade.position.y = 1.6;
        const arm = new THREE.Group();
        arm.rotation.z = (i / 3) * Math.PI * 2;
        arm.add(blade);
        prop.add(arm);
    }
    g.add(prop);
    g.userData.prop = prop;
    return g;
}

export function makeGlider(color) {
    const g = new THREE.Group();
    const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.6, side: THREE.DoubleSide });
    const white = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.6, side: THREE.DoubleSide });
    for (let i = -3; i <= 3; i++) {
        const seg = new THREE.Mesh(boxGeo(0.62, 0.06, 1.5), i % 2 ? white : cloth);
        seg.position.set(i * 0.6, 2.85 - Math.abs(i) * Math.abs(i) * 0.045, 0);
        seg.rotation.z = -i * 0.09;
        seg.castShadow = true;
        g.add(seg);
    }
    for (const s of [-1, 1]) {
        const rope = new THREE.Mesh(boxGeo(0.025, 1.05, 0.025), lambert('#1f2937'));
        rope.position.set(s * 0.95, 2.35, 0);
        rope.rotation.z = s * 0.55;
        g.add(rope);
    }
    return g;
}

export function makeChest() {
    const g = new THREE.Group();
    const gold = lambert('#d99a1e', '#f59e0b');
    const wood = new THREE.MeshStandardMaterial({ color: '#7a4a1c', roughness: 0.8 });
    const trim = new THREE.MeshStandardMaterial({ color: '#fcd34d', roughness: 0.25, metalness: 0.9, emissive: new THREE.Color('#f59e0b'), emissiveIntensity: 0.4 });
    const base = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.6, 0.7, 2, 0.05), gold);
    base.position.y = 0.3;
    base.castShadow = true;
    g.add(base);
    for (const x of [-0.42, 0.42]) {
        const band = new THREE.Mesh(boxGeo(0.1, 0.62, 0.72), trim);
        band.position.set(x, 0.3, 0);
        g.add(band);
    }
    const lid = new THREE.Group();
    lid.position.set(0, 0.6, 0.35);
    const lidMesh = new THREE.Mesh(new RoundedBoxGeometry(1.12, 0.28, 0.72, 2, 0.08), gold);
    lidMesh.position.set(0, 0.14, -0.35);
    lidMesh.castShadow = true;
    lid.add(lidMesh);
    const lidBand = new THREE.Mesh(boxGeo(1.14, 0.06, 0.74), wood);
    lidBand.position.set(0, 0.02, -0.35);
    lid.add(lidBand);
    g.add(lid);
    const lock = new THREE.Mesh(boxGeo(0.18, 0.22, 0.05), trim);
    lock.position.set(0, 0.55, -0.37);
    g.add(lock);
    const glow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.75, 2.4, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: '#fde68a', transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    glow.position.y = 1.2;
    g.add(glow);
    g.userData.lid = lid;
    g.userData.glow = glow;
    return g;
}

const beamGeo = new THREE.CylinderGeometry(0.12, 0.3, 7, 10, 1, true);
export function makeLootMesh(item, rarityColor) {
    const g = new THREE.Group();
    if (item.kind === 'weapon') {
        const w = makeWeaponMesh(item.type, rarityColor, item.rarity);
        w.rotation.y = Math.PI / 2;
        w.scale.setScalar(1.5);
        g.add(w);
    } else if (item.kind === 'heal') {
        rpart(g, 0.36, 0.44, 0.36, item.color, 0, 0, 0, { glow: item.color, gi: 0.35, r: 0.08, metal: 0 });
        rpart(g, 0.38, 0.1, 0.13, '#fff', 0, 0.05, 0, { metal: 0 });
        rpart(g, 0.13, 0.3, 0.38, '#fff', 0, 0.05, 0, { metal: 0 });
    } else if (item.kind === 'ammo') {
        rpart(g, 0.5, 0.25, 0.3, '#3f4a3c', 0, 0, 0, { metal: 0.2 });
        rpart(g, 0.52, 0.08, 0.32, item.color, 0, 0.08, 0, { metal: 0.2 });
    } else {
        rpart(g, 0.7, 0.12, 0.3, '#a0703c', 0, 0, 0, { metal: 0, rough: 0.8 });
        rpart(g, 0.7, 0.12, 0.3, '#8a5c2c', 0, 0.13, 0, { metal: 0, rough: 0.8 }).rotation.y = 0.3;
    }
    const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.45, 0.62, 24),
        new THREE.MeshBasicMaterial({ color: rarityColor, transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.45;
    g.add(ring);
    if (item.kind === 'weapon' && item.rarity >= 1) {
        const beam = new THREE.Mesh(
            beamGeo,
            new THREE.MeshBasicMaterial({ color: rarityColor, transparent: true, opacity: 0.18 + item.rarity * 0.06, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        beam.position.y = 3;
        g.add(beam);
    }
    return g;
}
