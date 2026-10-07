import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Rigged, fully animated heroes. Every character is a joint hierarchy
// (hips → spine → chest → neck → head, shoulder → elbow → hand,
// thigh → knee → ankle) driven by a procedural animator that blends
// locomotion, actions, reactions and secondary motion every frame.

const geoCache = new Map();
function rbox(w, h, d, r = 0.035) {
    const rr = Math.max(0.002, Math.min(r, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002));
    const key = `${w}|${h}|${d}|${rr}`;
    if (!geoCache.has(key)) geoCache.set(key, new RoundedBoxGeometry(w, h, d, 2, rr));
    return geoCache.get(key);
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const shade = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();

const JOINTS = ['hips', 'spine', 'chest', 'neck', 'head', 'shL', 'shR', 'elL', 'elR', 'thighL', 'thighR', 'kneeL', 'kneeR', 'ankleL', 'ankleR'];
const AXES = ['x', 'y', 'z'];

export function makeCharacter(look) {
    const mats = [];
    const cache = {};
    const M = (color, o = {}) => {
        const k = `${color}|${o.glow || ''}|${o.metal || 0}|${o.rough || 0}`;
        if (cache[k]) return cache[k];
        const m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.7, metalness: o.metal ?? 0 });
        if (o.glow) {
            m.emissive = new THREE.Color(o.glow);
            m.emissiveIntensity = o.gi ?? 1.2;
        }
        m.userData.baseEmissive = m.emissive.clone();
        m.userData.baseEI = m.emissiveIntensity;
        mats.push(m);
        cache[k] = m;
        return m;
    };
    const P = (parent, w, h, d, color, x, y, z, o = {}) => {
        const mesh = new THREE.Mesh(rbox(w, h, d, o.r ?? 0.035), M(color, o));
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        parent.add(mesh);
        return mesh;
    };
    const J = (parent, x, y, z) => {
        const g = new THREE.Group();
        g.position.set(x, y, z);
        parent.add(g);
        return g;
    };

    const sleeve = look.sleeve || look.shirt;
    const forearm = look.forearm || sleeve;
    const hands = look.gloves || look.skin;
    const root = new THREE.Group();
    const hips = J(root, 0, 0.92, 0);
    P(hips, 0.4, 0.2, 0.26, look.pants, 0, -0.02, 0, { r: 0.06 });
    P(hips, 0.42, 0.07, 0.28, look.accent || '#222', 0, 0.07, 0);
    P(hips, 0.08, 0.06, 0.02, '#e4e4e7', 0, 0.07, -0.146, { metal: 0.7, rough: 0.3 });

    const legs = {};
    for (const [side, s] of [['L', -1], ['R', 1]]) {
        const thigh = J(hips, s * 0.11, -0.06, 0);
        P(thigh, 0.17, 0.44, 0.19, look.pants, 0, -0.2, 0, { r: 0.06 });
        const knee = J(thigh, 0, -0.42, 0);
        P(knee, 0.15, 0.42, 0.17, look.pants, 0, -0.2, 0, { r: 0.05 });
        if (look.kneepads) P(knee, 0.16, 0.12, 0.05, look.kneepads, 0, -0.03, -0.085);
        const ankle = J(knee, 0, -0.41, 0);
        P(ankle, 0.16, 0.1, 0.28, look.shoes, 0, -0.035, -0.05, { r: 0.04 });
        P(ankle, 0.165, 0.035, 0.29, shade(look.shoes, 0.55), 0, -0.085, -0.05, { r: 0.012 });
        legs['thigh' + side] = thigh;
        legs['knee' + side] = knee;
        legs['ankle' + side] = ankle;
    }

    const spine = J(hips, 0, 0.1, 0);
    P(spine, 0.37, 0.24, 0.23, look.shirt, 0, 0.1, 0, { r: 0.06 });
    const chest = J(spine, 0, 0.2, 0);
    P(chest, 0.52, 0.37, 0.29, look.shirt, 0, 0.16, 0, { r: 0.08 });
    P(chest, 0.3, 0.06, 0.24, shade(look.shirt, 0.8), 0, 0.35, 0);
    if (look.chest) P(chest, 0.17, 0.17, 0.03, look.chest, 0, 0.2, -0.148, { glow: look.glow, gi: 0.9 });
    if (look.backpack) {
        P(chest, 0.38, 0.42, 0.18, look.backpack, 0, 0.13, 0.23, { r: 0.07 });
        P(chest, 0.3, 0.1, 0.06, shade(look.backpack, 0.75), 0, -0.02, 0.33);
        P(chest, 0.05, 0.36, 0.02, shade(look.backpack, 0.7), -0.15, 0.17, -0.148);
        P(chest, 0.05, 0.36, 0.02, shade(look.backpack, 0.7), 0.15, 0.17, -0.148);
    }
    let cape = null;
    if (look.cape) {
        cape = J(chest, 0, 0.33, 0.16);
        P(cape, 0.54, 1.0, 0.035, look.cape, 0, -0.49, 0, { r: 0.012 });
        P(cape, 0.56, 0.08, 0.05, shade(look.cape, 0.75), 0, 0, 0);
    }
    let scarf = null;
    if (look.scarf) {
        P(chest, 0.44, 0.11, 0.35, look.scarf, 0, 0.37, 0, { r: 0.04 });
        scarf = J(chest, 0.12, 0.35, 0.17);
        P(scarf, 0.1, 0.45, 0.035, look.scarf, 0, -0.22, 0, { r: 0.012 });
    }

    const neck = J(chest, 0, 0.36, 0);
    P(neck, 0.13, 0.09, 0.13, look.skin, 0, 0.02, 0);
    const head = J(neck, 0, 0.06, 0);
    const faceSkin = look.hat === 'dino' ? '#4ade80' : look.skin;
    P(head, 0.34, 0.36, 0.33, look.skin, 0, 0.18, 0, { r: 0.09 });
    P(head, 0.045, 0.09, 0.07, look.skin, -0.18, 0.18, 0.02, { r: 0.02 });
    P(head, 0.045, 0.09, 0.07, look.skin, 0.18, 0.18, 0.02, { r: 0.02 });
    P(head, 0.05, 0.07, 0.05, shade(look.skin, 0.95), 0, 0.16, -0.17, { r: 0.02 });
    const eyes = J(head, 0, 0.215, -0.166);
    for (const s of [-1, 1]) {
        P(eyes, 0.078, 0.072, 0.012, '#ffffff', s * 0.075, 0, 0, { r: 0.005 });
        P(eyes, 0.042, 0.054, 0.012, look.eyes || '#2b3a55', s * 0.075, -0.004, -0.006, { r: 0.005 });
        P(eyes, 0.014, 0.014, 0.006, '#ffffff', s * 0.075 + 0.01, 0.01, -0.013, { r: 0.002 });
    }
    const browColor = look.brows || (look.hairStyle === 'none' ? shade(look.skin, 0.6) : shade(look.hair, 0.9));
    const browL = P(head, 0.09, 0.022, 0.016, browColor, -0.075, 0.275, -0.168, { r: 0.006 });
    const browR = P(head, 0.09, 0.022, 0.016, browColor, 0.075, 0.275, -0.168, { r: 0.006 });
    const mouth = P(head, 0.1, 0.024, 0.012, '#7a3b2e', 0, 0.09, -0.166, { r: 0.006 });
    void faceSkin;

    let tail = null;
    switch (look.hairStyle) {
        case 'short':
            P(head, 0.37, 0.1, 0.36, look.hair, 0, 0.37, 0.005, { r: 0.04 });
            P(head, 0.36, 0.22, 0.08, look.hair, 0, 0.26, 0.15, { r: 0.03 });
            P(head, 0.3, 0.06, 0.06, look.hair, 0.02, 0.33, -0.16, { r: 0.02 });
            break;
        case 'long':
            P(head, 0.37, 0.1, 0.36, look.hair, 0, 0.37, 0.005, { r: 0.04 });
            P(head, 0.38, 0.48, 0.1, look.hair, 0, 0.12, 0.16, { r: 0.04 });
            P(head, 0.06, 0.36, 0.2, look.hair, -0.185, 0.18, 0.04, { r: 0.025 });
            P(head, 0.06, 0.36, 0.2, look.hair, 0.185, 0.18, 0.04, { r: 0.025 });
            break;
        case 'ponytail':
            P(head, 0.37, 0.1, 0.36, look.hair, 0, 0.37, 0.005, { r: 0.04 });
            P(head, 0.36, 0.24, 0.08, look.hair, 0, 0.26, 0.15, { r: 0.03 });
            P(head, 0.09, 0.06, 0.09, look.accent || '#111', 0, 0.3, 0.2);
            tail = J(head, 0, 0.3, 0.21);
            P(tail, 0.11, 0.4, 0.11, look.hair, 0, -0.18, 0.03, { r: 0.05 });
            break;
        default:
            break;
    }
    if (look.beard) {
        P(head, 0.35, 0.12, 0.08, look.beard, 0, 0.06, -0.14, { r: 0.03 });
        P(head, 0.14, 0.03, 0.02, look.beard, 0, 0.125, -0.172);
    }

    switch (look.hat) {
        case 'hardhat':
            P(head, 0.4, 0.15, 0.4, '#facc15', 0, 0.41, 0, { r: 0.07, rough: 0.35 });
            P(head, 0.46, 0.035, 0.5, '#facc15', 0, 0.35, -0.03, { r: 0.015, rough: 0.35 });
            P(head, 0.06, 0.03, 0.42, '#eab308', 0, 0.49, 0);
            break;
        case 'goggles':
            P(head, 0.37, 0.07, 0.37, '#334155', 0, 0.3, 0, { r: 0.02 });
            P(head, 0.13, 0.09, 0.03, '#7dd3fc', -0.075, 0.3, -0.19, { glow: '#38bdf8', gi: 0.6, rough: 0.1 });
            P(head, 0.13, 0.09, 0.03, '#7dd3fc', 0.075, 0.3, -0.19, { glow: '#38bdf8', gi: 0.6, rough: 0.1 });
            break;
        case 'ninja':
            P(head, 0.37, 0.39, 0.36, '#18181b', 0, 0.185, 0.005, { r: 0.09 });
            P(head, 0.3, 0.09, 0.02, look.skin, 0, 0.215, -0.176);
            P(head, 0.07, 0.05, 0.01, '#111', -0.075, 0.215, -0.188);
            P(head, 0.07, 0.05, 0.01, '#111', 0.075, 0.215, -0.188);
            P(head, 0.38, 0.06, 0.37, look.accent, 0, 0.33, 0, { r: 0.02 });
            tail = J(head, 0.05, 0.33, 0.19);
            P(tail, 0.06, 0.34, 0.025, look.accent, 0, -0.16, 0, { r: 0.01 });
            break;
        case 'dino': {
            P(head, 0.42, 0.44, 0.42, '#22c55e', 0, 0.2, 0.02, { r: 0.1 });
            P(head, 0.34, 0.16, 0.2, '#22c55e', 0, 0.39, -0.24, { r: 0.06 });
            P(head, 0.28, 0.26, 0.02, look.skin, 0, 0.19, -0.2);
            for (let i = 0; i < 3; i++) P(head, 0.06, 0.12 - i * 0.02, 0.1, '#fde047', 0, 0.45 - i * 0.1, 0.12 + i * 0.09, { r: 0.02 });
            for (const s of [-1, 1]) P(head, 0.07, 0.07, 0.02, '#fff', s * 0.08, 0.47, -0.345);
            tail = J(hips, 0, -0.02, 0.15);
            P(tail, 0.2, 0.2, 0.55, '#22c55e', 0, 0, 0.24, { r: 0.08 });
            P(tail, 0.12, 0.12, 0.25, '#16a34a', 0, 0.02, 0.58, { r: 0.05 });
            break;
        }
        case 'mask':
            P(head, 0.355, 0.1, 0.02, '#111827', 0, 0.215, -0.17, { r: 0.01 });
            P(head, 0.06, 0.16, 0.05, '#facc15', 0, 0.44, -0.12, { glow: '#facc15', gi: 0.8 });
            break;
        case 'icecrown':
            for (let i = -2; i <= 2; i++) P(head, 0.05, 0.12 + (2 - Math.abs(i)) * 0.07, 0.05, '#a5f3fc', i * 0.07, 0.46 + (2 - Math.abs(i)) * 0.035, -0.1, { glow: '#67e8f9', gi: 1.1, rough: 0.15 });
            break;
        case 'crown':
            P(head, 0.38, 0.09, 0.38, '#facc15', 0, 0.42, 0, { glow: '#eab308', gi: 0.35, metal: 0.8, rough: 0.25 });
            for (const [x, z] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15], [0, -0.17]]) P(head, 0.06, 0.12, 0.06, '#facc15', x, 0.51, z, { glow: '#eab308', gi: 0.35, metal: 0.8, rough: 0.25 });
            P(head, 0.06, 0.06, 0.02, '#dc2626', 0, 0.42, -0.195, { glow: '#dc2626', gi: 0.9 });
            break;
        default:
            break;
    }

    const arms = {};
    for (const [side, s] of [['L', -1], ['R', 1]]) {
        const sh = J(chest, s * 0.31, 0.27, 0);
        sh.rotation.order = 'ZYX';
        P(sh, 0.15, 0.31, 0.15, sleeve, 0, -0.13, 0, { r: 0.05 });
        P(sh, 0.19, 0.1, 0.19, look.shoulder || sleeve, 0, 0.0, 0, { r: 0.05 });
        const el = J(sh, 0, -0.28, 0);
        P(el, 0.13, 0.27, 0.13, forearm, 0, -0.12, 0, { r: 0.045 });
        const hand = J(el, 0, -0.27, 0);
        P(hand, 0.12, 0.13, 0.12, hands, 0, -0.05, 0, { r: 0.04 });
        arms['sh' + side] = sh;
        arms['el' + side] = el;
        arms['hand' + side] = hand;
    }
    const hold = J(arms.handR, 0, -0.07, 0);

    const joints = { hips, spine, chest, neck, head, ...arms, ...legs };
    const channels = [];
    for (const j of JOINTS) for (const a of AXES) channels.push([joints[j], a, `${j}.${a}`]);
    const target = {};
    for (const [, , k] of channels) target[k] = 0;
    root.userData = {
        heldKey: null,
        rig: {
            joints,
            hold,
            eyes,
            brows: [browL, browR],
            mouth,
            cape,
            scarf,
            tail,
            mats,
            channels,
            target,
            phase: Math.random() * 6,
            blink: 1 + Math.random() * 3,
            springs: { cape: [0, 0], scarf: [0, 0], tail: [0, 0], tailZ: [0, 0] },
            lastYaw: 0,
            flash: 0,
            stepSide: 0
        }
    };
    return root;
}

export function setHeld(model, key, mesh) {
    const u = model.userData;
    if (u.heldKey === key) return;
    u.heldKey = key;
    const hold = u.rig.hold;
    while (hold.children.length) hold.remove(hold.children[0]);
    if (mesh) {
        mesh.traverse((o) => {
            if (o.isMesh) o.castShadow = true;
        });
        hold.add(mesh);
    }
}

const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _e = new THREE.Euler(0, 0, 0, 'YXZ');

function spring(s, target, stiff, damp, dt) {
    s[1] += ((target - s[0]) * stiff - s[1] * damp) * dt;
    s[0] += s[1] * dt;
    return s[0];
}

// s: { time, speed, fwd, side, vy, grounded, mode, hold, weapon, pitch, yaw,
//      shotT, reload, swing, use, build, hurtT, landT, deadT, emote, flash }
// Returns 1 when a foot just touched the ground (for footstep sounds).
export function animateRig(model, s, dt) {
    const R = model.userData.rig;
    if (!R) return 0;
    const T = R.target;
    for (const k in T) T[k] = 0;
    const t = s.time;
    const speed = s.speed || 0;
    const run = clamp((speed - 2) / 5, 0, 1);
    let hipsY = 0.92;
    let rate = 16;
    let step = 0;

    const mode = s.mode || 'ground';
    if (mode === 'dive') {
        const f = Math.sin(t * 15) * 0.07;
        T['shL.z'] = -1.35 + f;
        T['shR.z'] = 1.35 - f;
        T['shL.x'] = 0.35;
        T['shR.x'] = 0.35;
        T['elL.x'] = 0.45;
        T['elR.x'] = 0.45;
        T['thighL.z'] = -0.32;
        T['thighR.z'] = 0.32;
        T['thighL.x'] = -0.15 + f;
        T['thighR.x'] = -0.15 - f;
        T['kneeL.x'] = -0.75;
        T['kneeR.x'] = -0.75;
        T['head.x'] = 0.75;
        T['spine.x'] = 0.15;
    } else if (mode === 'glide') {
        const sw = Math.sin(t * 1.9);
        T['shL.x'] = 2.95;
        T['shR.x'] = 2.95;
        T['shL.z'] = -0.32;
        T['shR.z'] = 0.32;
        T['elL.x'] = 0.25;
        T['elR.x'] = 0.25;
        T['thighL.x'] = 0.25 + sw * 0.22;
        T['thighR.x'] = 0.1 - sw * 0.22;
        T['kneeL.x'] = -0.45;
        T['kneeR.x'] = -0.35;
        T['hips.z'] = Math.sin(t * 1.3) * 0.07;
        T['head.x'] = -0.15;
    } else if (mode === 'dead') {
        const k = clamp(s.deadT / 0.35, 0, 1);
        hipsY = 0.92 - 0.25 * (1 - Math.abs(1 - k * 2));
        T['shL.z'] = -1.25 * k;
        T['shR.z'] = 1.25 * k;
        T['shL.x'] = 0.5;
        T['shR.x'] = 0.3;
        T['elL.x'] = 0.5;
        T['elR.x'] = 0.7;
        T['thighL.x'] = 0.35;
        T['thighR.x'] = 0.1;
        T['kneeL.x'] = -0.7;
        T['kneeR.x'] = -0.4;
        T['head.x'] = 0.5;
        T['head.z'] = 0.3;
        rate = 10;
    } else if (mode === 'emote') {
        hipsY = emotePose(T, s.emote, t);
        rate = 20;
    } else {
        // ---- locomotion ----
        if (!s.grounded) {
            if (s.vy > 0.5) {
                T['thighL.x'] = 1.0;
                T['kneeL.x'] = -1.5;
                T['ankleL.x'] = 0.4;
                T['thighR.x'] = 0.1;
                T['kneeR.x'] = -0.55;
                T['shL.z'] = -0.55;
                T['shR.z'] = 0.55;
                T['shL.x'] = 0.5;
                T['shR.x'] = 0.5;
                T['elL.x'] = 0.7;
                T['elR.x'] = 0.7;
                T['spine.x'] = -0.1;
            } else {
                const fl = Math.sin(t * 7);
                T['thighL.x'] = 0.45 + fl * 0.2;
                T['kneeL.x'] = -0.9;
                T['thighR.x'] = -0.05 - fl * 0.2;
                T['kneeR.x'] = -0.5;
                T['shL.z'] = -0.95 + fl * 0.12;
                T['shR.z'] = 0.95 - fl * 0.12;
                T['shL.x'] = 0.25;
                T['shR.x'] = 0.25;
                T['elL.x'] = 0.4;
                T['elR.x'] = 0.4;
            }
            rate = 10;
        } else if (speed > 0.4) {
            let ang = Math.atan2(s.side || 0, s.fwd || 0);
            let dir = 1;
            if (Math.abs(ang) > Math.PI / 2 + 0.25) {
                dir = -1;
                ang -= Math.sign(ang) * Math.PI;
            }
            const prev = R.phase;
            R.phase += dt * (speed * 1.3 + 1.6) * dir;
            if (Math.floor(prev / Math.PI) !== Math.floor(R.phase / Math.PI)) step = 1;
            const p = R.phase;
            const a = lerp(0.42, 0.8, run) * clamp(speed / 3, 0.35, 1);
            const sp = Math.sin(p);
            const cp = Math.cos(p);
            T['thighL.x'] = sp * a - run * 0.1;
            T['thighR.x'] = -sp * a - run * 0.1;
            T['kneeL.x'] = -(0.08 + Math.max(0, cp * dir) * 1.45 * a + run * 0.25);
            T['kneeR.x'] = -(0.08 + Math.max(0, -cp * dir) * 1.45 * a + run * 0.25);
            T['ankleL.x'] = -(T['thighL.x'] + T['kneeL.x']) * 0.45;
            T['ankleR.x'] = -(T['thighR.x'] + T['kneeR.x']) * 0.45;
            hipsY = 0.92 - 0.06 * a + 0.06 * a * Math.abs(cp) - run * 0.03;
            const legYaw = clamp(-ang * 0.85, -1.15, 1.15);
            T['hips.y'] = legYaw + sp * 0.12 * a;
            T['hips.z'] = sp * 0.04 * a;
            T['spine.y'] = -legYaw * 0.5;
            T['chest.y'] = -legYaw * 0.5 - sp * 0.22 * a;
            T['spine.x'] = -0.16 * run;
            T['spine.z'] = -sp * 0.03 * a;
            T['head.y'] = sp * 0.08 * a;
            T['shL.x'] = -sp * a * 0.95;
            T['shR.x'] = sp * a * 0.95;
            T['shL.z'] = -0.1;
            T['shR.z'] = 0.1;
            T['elL.x'] = 0.25 + run * 0.95;
            T['elR.x'] = 0.25 + run * 0.95;
        } else {
            const br = Math.sin(t * 1.7);
            T['chest.x'] = br * 0.025;
            T['shL.z'] = -0.1 - br * 0.02;
            T['shR.z'] = 0.1 + br * 0.02;
            T['elL.x'] = 0.15;
            T['elR.x'] = 0.15;
            T['hips.z'] = Math.sin(t * 0.55) * 0.025;
            T['spine.z'] = -T['hips.z'];
            T['thighL.z'] = -0.05;
            T['thighR.z'] = 0.05;
            T['head.y'] = Math.sin(t * 0.37) * 0.14;
            T['head.x'] = Math.sin(t * 0.53) * 0.04;
            hipsY = 0.92 + br * 0.004;
        }
        if (s.landT !== undefined && s.landT < 0.28) {
            const k = 1 - s.landT / 0.28;
            hipsY -= 0.2 * k;
            T['thighL.x'] += 0.55 * k;
            T['thighR.x'] += 0.55 * k;
            T['kneeL.x'] -= 1.1 * k;
            T['kneeR.x'] -= 1.1 * k;
            T['ankleL.x'] += 0.55 * k;
            T['ankleR.x'] += 0.55 * k;
            T['spine.x'] -= 0.22 * k;
            rate = 30;
        }

        // ---- upper body ----
        const pitch = clamp(s.pitch || 0, -1.2, 1.2);
        if (s.hold === 'gun') {
            T['spine.x'] += pitch * 0.2;
            T['chest.x'] += pitch * 0.25;
            T['head.x'] += pitch * 0.35;
            const pistol = s.weapon === 'pistol';
            if (pistol) {
                T['shR.x'] = 1.5 + pitch * 0.5;
                T['shR.y'] = 0.08;
                T['elR.x'] = 0.12;
                T['shL.x'] = 1.45 + pitch * 0.5;
                T['shL.y'] = -0.45;
                T['elL.x'] = 0.28;
            } else {
                T['chest.y'] -= 0.22;
                T['head.y'] += 0.22;
                T['shR.x'] = 1.15 + pitch * 0.45;
                T['shR.y'] = 0.3;
                T['shR.z'] = 0.35;
                T['elR.x'] = 1.0;
                T['shL.x'] = 1.4 + pitch * 0.45;
                T['shL.y'] = -0.5;
                T['elL.x'] = 0.5;
            }
            if (s.shotT !== undefined && s.shotT < 0.25) {
                const heavy = s.weapon === 'shotgun' || s.weapon === 'sniper' ? 2 : 1;
                const k = Math.exp(-s.shotT * 18) * heavy;
                T['chest.x'] += 0.06 * k;
                T['shR.x'] += 0.16 * k;
                T['shL.x'] += 0.13 * k;
                T['head.x'] += 0.05 * k;
                rate = 40;
            }
            if (s.reload > 0) {
                const w = Math.sin(s.reload * Math.PI);
                T['shL.x'] = lerp(T['shL.x'], 0.55, w);
                T['shL.y'] = lerp(T['shL.y'], -0.15, w);
                T['elL.x'] = lerp(T['elL.x'], 1.9, w);
                T['head.x'] -= 0.25 * w;
            }
        } else if (s.hold === 'pick') {
            T['shR.x'] = 0.55;
            T['shR.z'] = 0.18;
            T['elR.x'] = 0.65;
            if (speed <= 0.4 || !s.grounded) {
                T['shL.x'] = 0.3;
                T['shL.z'] = -0.18;
                T['elL.x'] = 0.45;
            }
            const sw = s.swing;
            if (sw > 0 && sw < 1) {
                rate = 42;
                if (sw < 0.35) {
                    const k = sw / 0.35;
                    T['shR.x'] = lerp(0.55, 2.9, k);
                    T['elR.x'] = lerp(0.65, 1.3, k);
                    T['chest.y'] += 0.4 * k;
                    T['spine.x'] += 0.12 * k;
                } else if (sw < 0.6) {
                    const k = (sw - 0.35) / 0.25;
                    T['shR.x'] = lerp(2.9, -0.15, k);
                    T['elR.x'] = lerp(1.3, 0.1, k);
                    T['chest.y'] += lerp(0.4, -0.4, k);
                    T['spine.x'] += lerp(0.12, -0.28, k);
                } else {
                    const k = (sw - 0.6) / 0.4;
                    T['shR.x'] = lerp(-0.15, 0.55, k);
                    T['elR.x'] = lerp(0.1, 0.65, k);
                    T['chest.y'] += lerp(-0.4, 0, k);
                    T['spine.x'] += lerp(-0.28, 0, k);
                }
            }
        } else if (s.hold === 'heal') {
            const b = Math.sin(t * 9) * 0.08;
            T['shR.x'] = 1.05;
            T['shR.y'] = -0.45;
            T['elR.x'] = 1.25 + b;
            T['shL.x'] = 1.05;
            T['shL.y'] = 0.45;
            T['elL.x'] = 1.25 - b;
            T['head.x'] = -0.4;
        } else if (s.hold === 'build') {
            const k = s.build !== undefined && s.build < 0.25 ? Math.sin((s.build / 0.25) * Math.PI) : 0;
            T['shR.x'] = 1.0 + pitch * 0.4 + k * 0.9;
            T['elR.x'] = 0.35 + k * 0.6;
            T['shL.x'] = 0.7 + pitch * 0.3;
            T['shL.y'] = -0.3;
            T['elL.x'] = 0.4;
            T['chest.x'] += pitch * 0.2;
            T['head.x'] += pitch * 0.3;
            if (k) rate = 35;
        }
        if (s.hurtT !== undefined && s.hurtT < 0.25) {
            const k = 1 - s.hurtT / 0.25;
            T['chest.x'] += 0.22 * k;
            T['head.x'] += 0.15 * k;
            T['spine.z'] += 0.08 * k;
        }
    }

    // apply with critically-damped smoothing so poses blend instead of popping
    const k = 1 - Math.exp(-rate * dt);
    for (const [obj, axis, key] of R.channels) obj.rotation[axis] += (T[key] - obj.rotation[axis]) * k;
    const hips = R.joints.hips;
    hips.position.y += (hipsY - hips.position.y) * k;

    // aim the held gun along the view, wherever the hand ends up
    const held = R.hold.children[0];
    if (held && s.hold === 'gun' && mode === 'ground') {
        model.updateMatrixWorld(true);
        R.hold.parent.getWorldQuaternion(_q);
        const tilt = s.reload > 0 ? Math.sin(s.reload * Math.PI) * 0.7 : 0;
        _e.set(clamp(s.pitch || 0, -1.3, 1.3), s.yaw ?? model.rotation.y, tilt, 'YXZ');
        _q2.setFromEuler(_e);
        R.hold.quaternion.copy(_q.invert().multiply(_q2));
    } else if (held) {
        R.hold.quaternion.setFromEuler(_e.set(-Math.PI / 2, 0, 0, 'XYZ'));
    }

    // secondary motion: cape, scarf and hair react to speed and turning
    const yawVel = (model.rotation.y - R.lastYaw) / Math.max(dt, 1e-3);
    R.lastYaw = model.rotation.y;
    const air = mode === 'dive' ? 1.25 : mode === 'glide' ? 0.6 : 0;
    const flutter = Math.sin(t * 11 + R.phase) * 0.05 * Math.min(1, speed / 6 + air);
    if (R.cape) R.cape.rotation.x = -spring(R.springs.cape, 0.1 + clamp(speed * 0.1, 0, 0.85) + air + flutter, 70, 9, dt);
    if (R.scarf) R.scarf.rotation.x = -spring(R.springs.scarf, 0.15 + clamp(speed * 0.13, 0, 1.1) + air + flutter * 2, 90, 8, dt);
    if (R.tail) {
        R.tail.rotation.x = -spring(R.springs.tail, 0.2 + clamp(speed * 0.06, 0, 0.6) + air * 0.8 + Math.sin(R.phase * 2) * 0.08 * Math.min(1, speed / 4), 80, 7, dt);
        R.tail.rotation.z = spring(R.springs.tailZ, clamp(-yawVel * 0.08, -0.6, 0.6), 60, 6, dt);
    }

    // blinking and expressions
    R.blink -= dt;
    if (R.blink < 0) R.blink = 2 + Math.random() * 4;
    R.eyes.scale.y = R.blink < 0.12 ? 0.15 : 1;
    const angry = s.hold === 'gun' && s.shotT !== undefined && s.shotT < 1.2;
    R.brows[0].rotation.z = angry ? -0.25 : 0;
    R.brows[1].rotation.z = angry ? 0.25 : 0;
    R.mouth.scale.x = mode === 'emote' ? 1.3 : 1;
    R.mouth.scale.y = mode === 'emote' ? 2.2 : s.hurtT !== undefined && s.hurtT < 0.3 ? 2.5 : 1;

    // hit flash
    const fl = s.flash || 0;
    if (fl > 0 || R.flash > 0) {
        for (const m of R.mats) {
            if (fl > 0) {
                m.emissive.setRGB(1, 1, 1);
                m.emissiveIntensity = fl * 0.4;
            } else {
                m.emissive.copy(m.userData.baseEmissive);
                m.emissiveIntensity = m.userData.baseEI;
            }
        }
        R.flash = fl;
    }
    return step;
}

function emotePose(T, emote, t) {
    if (emote === 'wave') {
        const br = Math.sin(t * 1.7);
        T['shR.x'] = 2.7;
        T['shR.z'] = 0.45 + Math.sin(t * 9) * 0.35;
        T['elR.x'] = 0.5;
        T['shL.z'] = -0.12;
        T['elL.x'] = 0.2;
        T['head.z'] = Math.sin(t * 2) * 0.08;
        T['head.x'] = 0.08;
        T['hips.z'] = Math.sin(t * 1.4) * 0.04;
        return 0.92 + br * 0.005;
    }
    if (emote === 'cheer') {
        const j = Math.abs(Math.sin(t * 5.5));
        T['shL.x'] = 2.8;
        T['shR.x'] = 2.8;
        T['shL.z'] = -0.45 + Math.sin(t * 11) * 0.15;
        T['shR.z'] = 0.45 - Math.sin(t * 11) * 0.15;
        T['elL.x'] = 0.3;
        T['elR.x'] = 0.3;
        T['thighL.x'] = 0.5 * (1 - j);
        T['thighR.x'] = 0.5 * (1 - j);
        T['kneeL.x'] = -1.0 * (1 - j);
        T['kneeR.x'] = -1.0 * (1 - j);
        T['ankleL.x'] = 0.5 * (1 - j);
        T['ankleR.x'] = 0.5 * (1 - j);
        T['head.x'] = 0.25;
        return 0.82 + j * 0.28;
    }
    // dance
    const b = t * Math.PI * 2 * 1.8;
    const s1 = Math.sin(b);
    const c1 = Math.cos(b);
    T['hips.z'] = s1 * 0.13;
    T['spine.z'] = -s1 * 0.1;
    T['chest.y'] = Math.sin(b / 2) * 0.4;
    T['thighL.x'] = Math.max(0, s1) * 0.75;
    T['kneeL.x'] = -Math.max(0, s1) * 1.3;
    T['thighR.x'] = Math.max(0, -s1) * 0.75;
    T['kneeR.x'] = -Math.max(0, -s1) * 1.3;
    T['shL.x'] = 1.2 + c1 * 1.25;
    T['shR.x'] = 1.2 - c1 * 1.25;
    T['shL.z'] = -0.35;
    T['shR.z'] = 0.35;
    T['elL.x'] = 0.9;
    T['elR.x'] = 0.9;
    T['head.x'] = Math.abs(c1) * 0.22 - 0.05;
    T['head.z'] = s1 * 0.12;
    return 0.9 - Math.abs(s1) * 0.07;
}
