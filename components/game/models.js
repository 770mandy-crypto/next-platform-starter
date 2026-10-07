import * as THREE from 'three';

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

function part(parent, w, h, d, color, x, y, z, emissive) {
    const m = new THREE.Mesh(boxGeo(w, h, d), lambert(color, emissive));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
}

// Builds a humanoid hero. The model faces -z with its feet at y = 0.
export function makeCharacter(look) {
    const root = new THREE.Group();
    const body = new THREE.Group();
    body.scale.setScalar(0.9);
    root.add(body);
    const sleeve = look.sleeve || look.shirt;

    const legL = new THREE.Group();
    legL.position.set(-0.16, 0.92, 0);
    body.add(legL);
    part(legL, 0.26, 0.82, 0.28, look.pants, 0, -0.41, 0);
    part(legL, 0.28, 0.14, 0.38, look.shoes, 0, -0.85, -0.05);
    const legR = new THREE.Group();
    legR.position.set(0.16, 0.92, 0);
    body.add(legR);
    part(legR, 0.26, 0.82, 0.28, look.pants, 0, -0.41, 0);
    part(legR, 0.28, 0.14, 0.38, look.shoes, 0, -0.85, -0.05);

    const torso = new THREE.Group();
    torso.position.set(0, 0.92, 0);
    body.add(torso);
    part(torso, 0.66, 0.74, 0.36, look.shirt, 0, 0.37, 0);
    part(torso, 0.68, 0.1, 0.38, look.accent || '#222', 0, 0.06, 0);
    if (look.chest) part(torso, 0.26, 0.26, 0.04, look.chest, 0, 0.45, -0.19, look.glow);
    if (look.scarf) {
        part(torso, 0.5, 0.12, 0.42, look.scarf, 0, 0.72, 0);
        part(torso, 0.12, 0.4, 0.06, look.scarf, 0.12, 0.5, 0.21);
    }
    if (look.backpack) part(torso, 0.48, 0.5, 0.2, look.backpack, 0, 0.4, 0.28);
    if (look.cape) {
        const cape = part(torso, 0.62, 1.05, 0.05, look.cape, 0, 0.18, 0.22);
        cape.rotation.x = 0.12;
    }

    const head = new THREE.Group();
    head.position.set(0, 0.74, 0);
    torso.add(head);
    part(head, 0.46, 0.46, 0.46, look.skin, 0, 0.25, 0);
    part(head, 0.08, 0.09, 0.02, '#1b1b1f', -0.1, 0.28, -0.235);
    part(head, 0.08, 0.09, 0.02, '#1b1b1f', 0.1, 0.28, -0.235);
    part(head, 0.14, 0.03, 0.02, '#7a3b2e', 0, 0.13, -0.235);

    switch (look.hairStyle) {
        case 'short':
            part(head, 0.5, 0.14, 0.5, look.hair, 0, 0.52, 0.0);
            part(head, 0.5, 0.3, 0.1, look.hair, 0, 0.38, 0.22);
            break;
        case 'long':
            part(head, 0.5, 0.14, 0.5, look.hair, 0, 0.52, 0);
            part(head, 0.52, 0.62, 0.12, look.hair, 0, 0.2, 0.24);
            break;
        case 'ponytail':
            part(head, 0.5, 0.14, 0.5, look.hair, 0, 0.52, 0);
            part(head, 0.5, 0.3, 0.1, look.hair, 0, 0.38, 0.22);
            part(head, 0.14, 0.42, 0.14, look.hair, 0, 0.2, 0.34);
            break;
        default:
            break;
    }
    if (look.beard) part(head, 0.48, 0.16, 0.06, look.beard, 0, 0.08, -0.22);

    switch (look.hat) {
        case 'hardhat':
            part(head, 0.54, 0.16, 0.54, '#facc15', 0, 0.56, 0);
            part(head, 0.6, 0.04, 0.64, '#facc15', 0, 0.48, -0.04);
            break;
        case 'goggles':
            part(head, 0.5, 0.1, 0.5, '#334155', 0, 0.36, 0);
            part(head, 0.16, 0.1, 0.03, '#7dd3fc', -0.1, 0.36, -0.255, '#38bdf8');
            part(head, 0.16, 0.1, 0.03, '#7dd3fc', 0.1, 0.36, -0.255, '#38bdf8');
            break;
        case 'ninja':
            part(head, 0.5, 0.5, 0.5, '#18181b', 0, 0.25, 0.01);
            part(head, 0.4, 0.1, 0.02, look.skin, 0, 0.28, -0.255);
            part(head, 0.08, 0.06, 0.02, '#111', -0.1, 0.28, -0.262);
            part(head, 0.08, 0.06, 0.02, '#111', 0.1, 0.28, -0.262);
            part(head, 0.52, 0.08, 0.52, look.accent, 0, 0.44, 0);
            break;
        case 'dino': {
            part(head, 0.56, 0.56, 0.56, '#22c55e', 0, 0.28, 0.02);
            part(head, 0.44, 0.22, 0.24, '#22c55e', 0, 0.5, -0.32);
            part(head, 0.34, 0.24, 0.02, look.skin, 0, 0.24, -0.29);
            part(head, 0.07, 0.07, 0.02, '#111', -0.08, 0.27, -0.3);
            part(head, 0.07, 0.07, 0.02, '#111', 0.08, 0.27, -0.3);
            for (let i = 0; i < 3; i++) part(head, 0.08, 0.14, 0.12, '#fde047', 0, 0.6 - i * 0.12, 0.2 + i * 0.1);
            part(torso, 0.22, 0.22, 0.6, '#22c55e', 0, -0.1, 0.45).rotation.x = 0.5;
            break;
        }
        case 'mask':
            part(head, 0.48, 0.12, 0.02, '#111827', 0, 0.3, -0.24);
            part(head, 0.06, 0.18, 0.06, '#facc15', 0, 0.62, -0.1, '#facc15');
            break;
        case 'icecrown':
            for (let i = -2; i <= 2; i++) part(head, 0.07, 0.18 + (2 - Math.abs(i)) * 0.08, 0.07, '#a5f3fc', i * 0.1, 0.65, -0.12, '#67e8f9');
            break;
        case 'crown':
            part(head, 0.5, 0.12, 0.5, '#facc15', 0, 0.56, 0, '#eab308');
            for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2], [0, -0.2]]) part(head, 0.08, 0.14, 0.08, '#facc15', x, 0.68, z, '#eab308');
            part(head, 0.06, 0.06, 0.02, '#dc2626', 0, 0.56, -0.255, '#dc2626');
            break;
        default:
            break;
    }

    const armL = new THREE.Group();
    armL.position.set(-0.43, 0.66, 0);
    torso.add(armL);
    part(armL, 0.2, 0.62, 0.22, sleeve, 0, -0.3, 0);
    part(armL, 0.2, 0.14, 0.22, look.skin, 0, -0.66, 0);
    const armR = new THREE.Group();
    armR.position.set(0.43, 0.66, 0);
    torso.add(armR);
    part(armR, 0.2, 0.62, 0.22, sleeve, 0, -0.3, 0);
    part(armR, 0.2, 0.14, 0.22, look.skin, 0, -0.66, 0);
    const hold = new THREE.Group();
    hold.position.set(0, -0.68, 0);
    armR.add(hold);

    root.userData = { body, torso, legL, legR, armL, armR, head, hold, heldKey: null };
    return root;
}

// Puts the right item in the hand and animates walking, aiming and swinging.
export function poseCharacter(model, st) {
    const u = model.userData;
    const swing = Math.sin(st.walk) * (st.moving ? 0.7 : 0);
    u.legL.rotation.x = swing;
    u.legR.rotation.x = -swing;
    if (st.airborne) {
        u.legL.rotation.x = 0.5;
        u.legR.rotation.x = -0.3;
    }
    const pitch = st.pitch || 0;
    u.torso.rotation.x = 0;
    if (st.diving) {
        u.armL.rotation.set(Math.PI * 0.9, 0, -0.5);
        u.armR.rotation.set(Math.PI * 0.9, 0, 0.5);
        return;
    }
    if (st.holding === 'gun') {
        u.armR.rotation.set(Math.PI / 2 + pitch, 0, 0);
        u.armL.rotation.set(Math.PI / 2 + pitch - 0.1, 0, -0.55);
    } else if (st.holding === 'pick') {
        const s = st.swing > 0 ? Math.sin((1 - st.swing) * Math.PI) : 0;
        u.armR.rotation.set(0.6 + s * 1.8, 0, 0);
        u.armL.rotation.set(-swing * 0.8, 0, 0);
    } else if (st.holding === 'heal') {
        u.armR.rotation.set(1.2, 0, 0.4);
        u.armL.rotation.set(1.2, 0, -0.4);
    } else {
        u.armR.rotation.set(-swing * 0.8, 0, 0);
        u.armL.rotation.set(swing * 0.8, 0, 0);
    }
    if (st.build) u.armR.rotation.set(1.0, 0, 0);
}

export function setHeld(model, key, mesh) {
    const u = model.userData;
    if (u.heldKey === key) return;
    u.heldKey = key;
    while (u.hold.children.length) u.hold.remove(u.hold.children[0]);
    if (mesh) {
        mesh.rotation.x = -Math.PI / 2;
        u.hold.add(mesh);
    }
}

export function makeWeaponMesh(type, rarityColor) {
    const g = new THREE.Group();
    if (type === 'pickaxe') {
        part(g, 0.06, 0.06, 0.9, '#7c5a3a', 0, 0, -0.3);
        const head = part(g, 0.08, 0.5, 0.1, '#9ca3af', 0, 0, -0.72);
        head.rotation.x = 0.15;
        part(g, 0.1, 0.1, 0.12, '#38bdf8', 0, 0, -0.72, '#38bdf8');
        return g;
    }
    const len = { pistol: 0.35, smg: 0.55, ar: 0.8, shotgun: 0.75, sniper: 1.05 }[type] || 0.6;
    const bodyColor = type === 'shotgun' ? '#6b4423' : '#2d3036';
    part(g, 0.1, 0.16, len, bodyColor, 0, 0.02, -len / 2 + 0.05);
    part(g, 0.05, 0.05, len * 0.5, '#15171a', 0, 0.05, -len - 0.05 + 0.05);
    part(g, 0.11, 0.05, len * 0.6, rarityColor, 0, 0.11, -len / 2);
    part(g, 0.08, 0.2, 0.1, '#202226', 0, -0.12, 0.0);
    if (type === 'sniper') part(g, 0.07, 0.07, 0.35, '#111', 0, 0.17, -len * 0.45);
    if (type === 'ar' || type === 'smg') part(g, 0.07, 0.18, 0.08, '#202226', 0, -0.1, -len * 0.45);
    return g;
}

export function makeAirship() {
    const g = new THREE.Group();
    const balloon = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), lambert('#3b82f6'));
    balloon.scale.set(7, 6, 18);
    g.add(balloon);
    const stripe = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), lambert('#fbbf24'));
    stripe.scale.set(7.1, 1.2, 18.1);
    g.add(stripe);
    part(g, 5, 2.6, 9, '#f8fafc', 0, -7, 0);
    part(g, 5.2, 0.6, 9.2, '#ef4444', 0, -5.6, 0);
    for (const [x, y] of [[0, 6], [0, -6], [6, 0], [-6, 0]]) {
        const fin = part(g, x ? 4 : 0.5, y ? 4 : 0.5, 5, '#ef4444', x, y, 16);
        fin.rotation.z = 0;
    }
    const prop = part(g, 0.4, 5, 0.4, '#334155', 0, 0, 18.5);
    g.userData.prop = prop;
    return g;
}

export function makeGlider(color) {
    const g = new THREE.Group();
    part(g, 3.2, 0.12, 1.4, color, 0, 2.7, 0);
    part(g, 1.4, 0.1, 1.2, '#f8fafc', -1.6, 2.55, 0).rotation.z = 0.3;
    part(g, 1.4, 0.1, 1.2, '#f8fafc', 1.6, 2.55, 0).rotation.z = -0.3;
    part(g, 0.04, 1.4, 0.04, '#111', -0.8, 2.0, 0).rotation.z = -0.4;
    part(g, 0.04, 1.4, 0.04, '#111', 0.8, 2.0, 0).rotation.z = 0.4;
    return g;
}

export function makeChest() {
    const g = new THREE.Group();
    const gold = lambert('#d99a1e', '#f59e0b');
    const base = new THREE.Mesh(boxGeo(1.1, 0.6, 0.7), gold);
    base.position.y = 0.3;
    g.add(base);
    const lid = new THREE.Group();
    lid.position.set(0, 0.6, 0.35);
    const lidMesh = new THREE.Mesh(boxGeo(1.12, 0.26, 0.72), gold);
    lidMesh.position.set(0, 0.13, -0.35);
    lid.add(lidMesh);
    g.add(lid);
    part(g, 1.14, 0.08, 0.74, '#5b3a12', 0, 0.58, 0);
    part(g, 0.16, 0.2, 0.04, '#fef3c7', 0, 0.55, -0.37, '#fde68a');
    g.userData.lid = lid;
    return g;
}

export function makeLootMesh(item, rarityColor) {
    const g = new THREE.Group();
    if (item.kind === 'weapon') {
        const w = makeWeaponMesh(item.type, rarityColor);
        w.rotation.y = Math.PI / 2;
        w.scale.setScalar(1.4);
        g.add(w);
    } else if (item.kind === 'heal') {
        part(g, 0.35, 0.45, 0.35, item.color, 0, 0, 0, item.color);
        part(g, 0.37, 0.1, 0.12, '#fff', 0, 0.05, 0);
    } else if (item.kind === 'ammo') {
        part(g, 0.5, 0.25, 0.3, '#3f4a3c', 0, 0, 0);
        part(g, 0.52, 0.08, 0.32, item.color, 0, 0.08, 0);
    } else {
        part(g, 0.7, 0.12, 0.3, '#a0703c', 0, 0, 0);
        part(g, 0.7, 0.12, 0.3, '#8a5c2c', 0, 0.13, 0).rotation.y = 0.3;
    }
    const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.45, 0.6, 20),
        new THREE.MeshBasicMaterial({ color: rarityColor, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.45;
    g.add(ring);
    return g;
}
