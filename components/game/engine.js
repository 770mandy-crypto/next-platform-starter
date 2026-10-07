import * as THREE from 'three';
import {
    WORLDS,
    CHARACTERS,
    WEAPONS,
    PICKAXE,
    RARITIES,
    HEALS,
    AMMO,
    BOT_NAMES,
    GRID,
    LEVEL_H,
    BUILD_COST,
    BUILD_PIECES,
    STORM_PHASES
} from './data';
import { makeCharacter, poseCharacter, setHeld, makeWeaponMesh, makeAirship, makeGlider, makeChest, makeLootMesh, lambert } from './models';
import { Sfx } from './audio';

const G = GRID;
const H = LEVEL_H;
const MAP_R = 180; // island radius
const MAP_EXT = 200; // half-size of the map drawn on the minimap
const EXT = 232; // half-size of the terrain
const HF = 2; // heightfield resolution
const N = (EXT * 2) / HF + 1;
const CELL = 8; // spatial hash cell
const RAD = 0.38;
const HGT = 1.85;
const STEP = 0.6;
const GRAV = 24;
const JUMP = 8.4;
const BUS_Y = 150;
const DIRS = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0]
];
const RAMP_YAW = [0, -Math.PI / 2, Math.PI, Math.PI / 2];
const IDQ = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
};
const angleTo = (from, to, maxStep) => {
    let d = to - from;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return from + clamp(d, -maxStep, maxStep);
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmtTime = (s) => {
    s = Math.max(0, Math.ceil(s));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function mulberry32(a) {
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hash2(ix, iz, seed) {
    let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(seed, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
}

function vnoise(x, z, seed) {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = x - ix;
    const fz = z - iz;
    const ux = fx * fx * (3 - 2 * fx);
    const uz = fz * fz * (3 - 2 * fz);
    const a = hash2(ix, iz, seed);
    const b = hash2(ix + 1, iz, seed);
    const c = hash2(ix, iz + 1, seed);
    const d = hash2(ix + 1, iz + 1, seed);
    return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm(x, z, seed, oct = 4) {
    let s = 0;
    let amp = 0.5;
    let f = 1;
    let n = 0;
    for (let i = 0; i < oct; i++) {
        s += amp * (vnoise(x * f, z * f, seed + i * 17) * 2 - 1);
        n += amp;
        amp *= 0.5;
        f *= 2.03;
    }
    return s / n;
}

function spreadDir(d, spread, out = new THREE.Vector3()) {
    if (spread <= 0) return out.copy(d);
    const u = Math.abs(d.y) < 0.95 ? new THREE.Vector3().crossVectors(d, UP).normalize() : new THREE.Vector3(1, 0, 0);
    const v = new THREE.Vector3().crossVectors(d, u);
    const r = spread * Math.sqrt(Math.random());
    const a = Math.random() * Math.PI * 2;
    return out
        .copy(d)
        .addScaledVector(u, Math.cos(a) * r)
        .addScaledVector(v, Math.sin(a) * r)
        .normalize();
}

function rayBox(o, d, x0, y0, z0, x1, y1, z1) {
    let tmin = 0;
    let tmax = Infinity;
    if (Math.abs(d.x) < 1e-9) {
        if (o.x < x0 || o.x > x1) return null;
    } else {
        let a = (x0 - o.x) / d.x;
        let b = (x1 - o.x) / d.x;
        if (a > b) [a, b] = [b, a];
        tmin = Math.max(tmin, a);
        tmax = Math.min(tmax, b);
        if (tmin > tmax) return null;
    }
    if (Math.abs(d.y) < 1e-9) {
        if (o.y < y0 || o.y > y1) return null;
    } else {
        let a = (y0 - o.y) / d.y;
        let b = (y1 - o.y) / d.y;
        if (a > b) [a, b] = [b, a];
        tmin = Math.max(tmin, a);
        tmax = Math.min(tmax, b);
        if (tmin > tmax) return null;
    }
    if (Math.abs(d.z) < 1e-9) {
        if (o.z < z0 || o.z > z1) return null;
    } else {
        let a = (z0 - o.z) / d.z;
        let b = (z1 - o.z) / d.z;
        if (a > b) [a, b] = [b, a];
        tmin = Math.max(tmin, a);
        tmax = Math.min(tmax, b);
        if (tmin > tmax) return null;
    }
    return tmin;
}

// Instanced rendering for every static/destructible piece of the world, so
// thousands of walls and trees cost a handful of draw calls.
const _m = new THREE.Matrix4();
const _zero = new THREE.Matrix4().makeScale(0, 0, 0);
class Bucket {
    constructor(scene, geo, cap) {
        this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), cap);
        this.mesh.count = 0;
        this.mesh.frustumCulled = false;
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.mesh.setColorAt(0, new THREE.Color(1, 1, 1));
        this.cap = cap;
        this.free = [];
        this.n = 0;
        this.dirty = false;
        scene.add(this.mesh);
    }
    add(matrix, color) {
        const i = this.free.length ? this.free.pop() : this.n < this.cap ? this.n++ : -1;
        if (i < 0) return -1;
        this.mesh.setMatrixAt(i, matrix);
        this.mesh.setColorAt(i, color);
        if (i + 1 > this.mesh.count) this.mesh.count = i + 1;
        this.dirty = true;
        return i;
    }
    set(i, matrix) {
        if (i < 0) return;
        this.mesh.setMatrixAt(i, matrix);
        this.dirty = true;
    }
    color(i, c) {
        if (i < 0) return;
        this.mesh.setColorAt(i, c);
        this.dirty = true;
    }
    remove(i) {
        if (i < 0) return;
        this.mesh.setMatrixAt(i, _zero);
        this.free.push(i);
        this.dirty = true;
    }
    flush() {
        if (!this.dirty) return;
        this.mesh.instanceMatrix.needsUpdate = true;
        if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
        this.dirty = false;
    }
}

const col = (hex) => new THREE.Color(hex);
const vary = (hex, amt, r = Math.random) => {
    const c = new THREE.Color(hex);
    return c.multiplyScalar(1 - amt + r() * amt * 2);
};

export class Game {
    constructor(container, opts) {
        this.container = container;
        this.opts = opts;
        this.worldIndex = opts.worldIndex;
        this.world = WORLDS[opts.worldIndex];
        this.charDef = opts.character;
        this.touch = !!opts.touch;
        this.sfx = new Sfx();
        this.sfx.init();
        this.sfx.resume();
        this.time = 0;
        this.paused = false;
        this.ended = false;
        this.endT = null;
        this.won = false;
        this.pieces = [];
        this.grid = new Map();
        this.occupied = new Set();
        this.growing = [];
        this.drops = [];
        this.chests = [];
        this.chars = [];
        this.particles = [];
        this.tracers = [];
        this.dmgNums = [];
        this.killfeed = [];
        this.msg = null;
        this.keys = new Set();
        this.pressed = new Set();
        this.input = { fire: false, firePressed: false, aim: false, lookDX: 0, lookDY: 0, joyX: 0, joyY: 0, wheel: 0, btn: new Set() };
        this.yaw = 0;
        this.pitch = -0.4;
        this.sens = 0.0024;
        this.aiming = false;
        this.buildMode = false;
        this.buildPiece = 'wall';
        this.buildCd = 0;
        this.fireQueued = 0;
        this.showMap = false;
        this.hitmarker = 0;
        this.hitHead = false;
        this.hurtFlash = 0;
        this.inStorm = false;
        this.camDir = new THREE.Vector3(0, 0, -1);
        this.camPos = new THREE.Vector3();
        this.stats = { dmg: 0 };
        // Desktop waits for the first click (pointer lock) before the airship takes off.
        this.started = this.touch;
        this.paused = !this.touch;

        this.initRenderer();
        this.buildWorld();
        this.initChars();
        this.initInput();
        this.last = performance.now();
        this.hudT = 0;
        this.loop = this.loop.bind(this);
        this.raf = requestAnimationFrame(this.loop);
    }

    // ---------- setup ----------

    initRenderer() {
        const w = this.container.clientWidth || window.innerWidth;
        const h = this.container.clientHeight || window.innerHeight;
        this.renderer = new THREE.WebGLRenderer({ antialias: !this.touch, powerPreference: 'high-performance' });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.touch ? 1.25 : 1.75));
        this.renderer.setSize(w, h);
        const cv = this.renderer.domElement;
        cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;';
        this.container.appendChild(cv);
        this.canvas = cv;
        this.overlay = document.createElement('canvas');
        this.overlay.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
        this.container.appendChild(this.overlay);
        this.ctx = this.overlay.getContext('2d');

        this.scene = new THREE.Scene();
        this.scene.background = col(this.world.sky);
        this.scene.fog = new THREE.Fog(this.world.fog, 150, 520);
        this.camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1400);
        this.fov = 75;
        const hemi = new THREE.HemisphereLight(this.world.sky, this.world.ground[1], 1.5);
        this.scene.add(hemi);
        const sun = new THREE.DirectionalLight(this.world.sun, 2.1);
        sun.position.set(80, 160, 60);
        this.scene.add(sun);

        this.resize = () => {
            const W = this.container.clientWidth || window.innerWidth;
            const Hh = this.container.clientHeight || window.innerHeight;
            this.renderer.setSize(W, Hh);
            this.camera.aspect = W / Hh;
            this.camera.updateProjectionMatrix();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.overlay.width = W * dpr;
            this.overlay.height = Hh * dpr;
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.vw = W;
            this.vh = Hh;
        };
        this.resize();
        this.ro = new ResizeObserver(this.resize);
        this.ro.observe(this.container);
    }

    buildWorld() {
        const S = this.scene;
        this.buckets = {
            box: new Bucket(S, new THREE.BoxGeometry(1, 1, 1), 9000),
            cone: new Bucket(S, new THREE.ConeGeometry(0.5, 1, 7), 1500),
            cyl: new Bucket(S, new THREE.CylinderGeometry(0.5, 0.5, 1, 7), 1500),
            blob: new Bucket(S, new THREE.IcosahedronGeometry(0.5, 0), 1500),
            rock: new Bucket(S, new THREE.DodecahedronGeometry(0.5, 0), 600)
        };
        this.genHeightfield();
        this.genTerrainMesh();

        const water = new THREE.Mesh(
            new THREE.PlaneGeometry(4000, 4000),
            new THREE.MeshLambertMaterial({ color: this.world.water, transparent: true, opacity: 0.85 })
        );
        water.rotation.x = -Math.PI / 2;
        water.position.y = this.world.waterLevel;
        S.add(water);

        if (this.world.lava) {
            this.lavaY = this.heightAt(0, 0) + 1.2;
            const lava = new THREE.Mesh(new THREE.CircleGeometry(15, 24), new THREE.MeshBasicMaterial({ color: '#ff6a1a' }));
            lava.rotation.x = -Math.PI / 2;
            lava.position.set(0, this.lavaY, 0);
            S.add(lava);
            this.lavaMesh = lava;
        }

        const r = mulberry32(this.world.seed * 13 + 5);
        for (const poi of this.pois) this.genPoi(poi, r);
        this.genNature(r);
        this.genFieldLoot();

        // the storm wall
        this.stormMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(1, 1, 700, 72, 1, true),
            new THREE.MeshBasicMaterial({ color: '#9b30ff', transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })
        );
        this.stormMesh.position.y = 150;
        S.add(this.stormMesh);
        this.initStorm();

        // the airship route
        const a = Math.random() * Math.PI * 2;
        const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar((Math.random() - 0.5) * 80);
        const speed = 26;
        const len = MAP_R * 2.6;
        this.bus = {
            start: dir.clone().multiplyScalar(-len / 2).add(side).setY(BUS_Y),
            dir,
            speed,
            t: 0,
            dur: len / speed,
            pos: new THREE.Vector3()
        };
        this.bus.end = this.bus.start.clone().addScaledVector(dir, len);
        this.airship = makeAirship();
        this.airship.rotation.y = Math.atan2(-dir.x, -dir.z);
        S.add(this.airship);
        this.bus.pos.copy(this.bus.start);

        this.ghost = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshBasicMaterial({ color: '#4aa8ff', transparent: true, opacity: 0.38, depthWrite: false })
        );
        this.ghost.visible = false;
        S.add(this.ghost);

        this.initEffects();
        this.makeMapImage();
    }

    rawHeight(x, z) {
        const w = this.world;
        const t = w.terrain;
        const s = w.seed;
        let h = t.base + fbm(x * t.freq, z * t.freq, s) * t.amp;
        const d = Math.hypot(x, z);
        if (t.style === 'dunes') h += Math.sin(x * 0.045 + fbm(x * 0.01, z * 0.01, s + 5) * 3) * 2.5;
        if (t.style === 'mountains') h += Math.pow(Math.max(0, fbm(x * 0.006, z * 0.006, s + 3)), 1.2) * 60;
        if (t.style === 'volcano') {
            h += 50 * Math.pow(Math.max(0, 1 - d / 105), 1.3);
            if (d < 19) h -= (19 - d) * 1.7;
        }
        if (t.style === 'mixed') h += 42 * Math.pow(Math.max(0, 1 - Math.hypot(x + 95, z + 90) / 78), 1.4);
        const e = smooth(MAP_R + 25, MAP_R - 15, d);
        return lerp(-9, h, e);
    }

    genHeightfield() {
        const w = this.world;
        const r = mulberry32(w.seed * 7 + 1);
        const n = w.pois.length;
        const center = !w.noCenterPoi;
        this.pois = w.pois.map((name, i) => {
            let x;
            let z;
            if (center && i === 0) {
                x = (r() - 0.5) * 30;
                z = (r() - 0.5) * 30;
            } else {
                const k = center ? i - 1 : i;
                const m = center ? n - 1 : n;
                const a = (k / m) * Math.PI * 2 + r() * 0.5;
                const dd = 88 + r() * 48;
                x = Math.cos(a) * dd;
                z = Math.sin(a) * dd;
            }
            return { name, x, z, h: 0 };
        });
        for (const p of this.pois) p.h = Math.max(this.rawHeight(p.x, p.z), w.waterLevel + 1.6);
        this.hf = new Float32Array(N * N);
        for (let iz = 0; iz < N; iz++) {
            for (let ix = 0; ix < N; ix++) {
                const x = -EXT + ix * HF;
                const z = -EXT + iz * HF;
                let h = this.rawHeight(x, z);
                for (const p of this.pois) {
                    const k = smooth(48, 32, Math.hypot(x - p.x, z - p.z));
                    if (k > 0) h = lerp(h, p.h, k);
                }
                this.hf[iz * N + ix] = h;
            }
        }
    }

    heightAt(x, z) {
        const gx = clamp((x + EXT) / HF, 0, N - 1.001);
        const gz = clamp((z + EXT) / HF, 0, N - 1.001);
        const ix = Math.floor(gx);
        const iz = Math.floor(gz);
        const fx = gx - ix;
        const fz = gz - iz;
        const i = iz * N + ix;
        const a = this.hf[i];
        const b = this.hf[i + 1];
        const c = this.hf[i + N];
        const d = this.hf[i + N + 1];
        return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
    }

    terrainColor(h, x, z, out) {
        const w = this.world;
        const rel = h - w.waterLevel;
        const g = w.ground;
        const n = vnoise(x * 0.15, z * 0.15, 3) * 0.12 - 0.06;
        if (rel < 1.2) out.set(w.shore);
        else {
            const t = clamp((rel - 1.2) / 26, 0, 1);
            if (t < 0.5) out.set(g[0]).lerp(_c2.set(g[1]), t * 2);
            else out.set(g[1]).lerp(_c2.set(g[2]), (t - 0.5) * 2);
        }
        if (w.lava && Math.hypot(x, z) < 26) out.lerp(_c2.set('#2a1a14'), 0.6);
        return out.multiplyScalar(1 + n);
    }

    genTerrainMesh() {
        const geo = new THREE.PlaneGeometry(EXT * 2, EXT * 2, N - 1, N - 1);
        geo.rotateX(-Math.PI / 2);
        const pos = geo.attributes.position;
        const colors = new Float32Array(pos.count * 3);
        const c = new THREE.Color();
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            const ix = Math.round((x + EXT) / HF);
            const iz = Math.round((z + EXT) / HF);
            const h = this.hf[iz * N + ix];
            pos.setY(i, h);
            this.terrainColor(h, x, z, c);
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
        this.scene.add(mesh);
        this.terrain = mesh;
    }

    // ---------- pieces (walls, floors, ramps, trees, rocks) ----------

    gridKeys(box, fn) {
        const x0 = Math.floor(box.min.x / CELL);
        const x1 = Math.floor(box.max.x / CELL);
        const z0 = Math.floor(box.min.z / CELL);
        const z1 = Math.floor(box.max.z / CELL);
        for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) fn((ix + 512) * 4096 + iz + 512);
    }

    near(x, z, r, out) {
        out.length = 0;
        const x0 = Math.floor((x - r) / CELL);
        const x1 = Math.floor((x + r) / CELL);
        const z0 = Math.floor((z - r) / CELL);
        const z1 = Math.floor((z + r) / CELL);
        for (let ix = x0; ix <= x1; ix++)
            for (let iz = z0; iz <= z1; iz++) {
                const a = this.grid.get((ix + 512) * 4096 + iz + 512);
                if (a) out.push(a);
            }
        return out;
    }

    addPiece(def) {
        const pc = {
            kind: def.kind,
            parts: [],
            box: def.box,
            hp: def.hp,
            maxHp: def.hp,
            yieldMats: def.yieldMats || 0,
            base: def.base ?? null,
            level: !!def.level,
            ramp: def.ramp || null,
            solid: def.solid !== false,
            key: def.key || null,
            built: !!def.built,
            alive: true,
            grow: def.built ? 0 : 1
        };
        for (const p of def.parts) {
            const quat = p.quat || IDQ;
            const scale = p.scale;
            _m.compose(p.pos, quat, def.built ? _s.copy(scale).multiplyScalar(0.2) : scale);
            const i = this.buckets[p.b].add(_m, p.color);
            pc.parts.push({ b: p.b, i, pos: p.pos, quat, scale, color: p.color.clone() });
        }
        const c = def.box.getCenter(new THREE.Vector3());
        pc.cx = c.x;
        pc.cy = c.y;
        pc.cz = c.z;
        pc.rad = def.box.getSize(_v1).length() / 2;
        this.pieces.push(pc);
        this.gridKeys(pc.box, (k) => {
            let a = this.grid.get(k);
            if (!a) this.grid.set(k, (a = []));
            a.push(pc);
        });
        if (pc.key) this.occupied.add(pc.key);
        if (pc.built) this.growing.push(pc);
        return pc;
    }

    damagePiece(pc, amount) {
        if (!pc.alive) return;
        pc.hp -= amount;
        const k = 0.45 + 0.55 * Math.max(0, pc.hp) / pc.maxHp;
        for (const p of pc.parts) this.buckets[p.b].color(p.i, _c1.copy(p.color).multiplyScalar(k));
        if (pc.hp <= 0) this.destroyPiece(pc);
    }

    destroyPiece(pc) {
        pc.alive = false;
        for (const p of pc.parts) this.buckets[p.b].remove(p.i);
        const i = this.pieces.indexOf(pc);
        if (i >= 0) this.pieces.splice(i, 1);
        this.gridKeys(pc.box, (k) => {
            const a = this.grid.get(k);
            if (!a) return;
            const j = a.indexOf(pc);
            if (j >= 0) a.splice(j, 1);
        });
        if (pc.key) this.occupied.delete(pc.key);
        this.burst(_v1.set(pc.cx, pc.cy, pc.cz), pc.parts[0]?.color.getHexString() || 'aaaaaa', 10, 4);
        if (this.distToPlayer(pc.cx, pc.cy, pc.cz) < 40) this.sfx.burst(0.35, 0.25, 500, 1);
    }

    boxPart(b, x, y, z, sx, sy, sz, color, quat) {
        return { b, pos: new THREE.Vector3(x, y, z), scale: new THREE.Vector3(sx, sy, sz), color, quat };
    }

    addWall(line, lx, lz, base, height, color, opts = {}) {
        const skirt = opts.skirt || 0;
        const y0 = base - skirt;
        const hh = height + skirt;
        const cy = y0 + hh / 2;
        let x;
        let z;
        let sx;
        let sz;
        if (line === 'h') {
            x = (lx + 0.5) * G;
            z = lz * G;
            sx = G;
            sz = 0.3;
        } else {
            x = lx * G;
            z = (lz + 0.5) * G;
            sx = 0.3;
            sz = G;
        }
        const box = new THREE.Box3(new THREE.Vector3(x - sx / 2, y0, z - sz / 2), new THREE.Vector3(x + sx / 2, y0 + hh, z + sz / 2));
        return this.addPiece({
            kind: 'wall',
            parts: [this.boxPart('box', x, cy, z, sx, hh, sz, color)],
            box,
            hp: opts.hp || 150,
            yieldMats: opts.yieldMats ?? 10,
            base,
            level: opts.level !== false,
            key: opts.key,
            built: opts.built
        });
    }

    addFloor(cx, cz, base, color, opts = {}) {
        const x = (cx + 0.5) * G;
        const z = (cz + 0.5) * G;
        const box = new THREE.Box3(new THREE.Vector3(x - G / 2, base - 0.2, z - G / 2), new THREE.Vector3(x + G / 2, base, z + G / 2));
        return this.addPiece({
            kind: 'floor',
            parts: [this.boxPart('box', x, base - 0.1, z, G, 0.2, G, color)],
            box,
            hp: opts.hp || 140,
            yieldMats: 8,
            base,
            level: true,
            key: opts.key,
            built: opts.built
        });
    }

    addRamp(cx, cz, q, base, color, opts = {}) {
        const x = (cx + 0.5) * G;
        const z = (cz + 0.5) * G;
        const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.atan(H / G), RAMP_YAW[q], 0, 'YXZ'));
        const box = new THREE.Box3(new THREE.Vector3(x - G / 2, base, z - G / 2), new THREE.Vector3(x + G / 2, base + H + 0.2, z + G / 2));
        return this.addPiece({
            kind: 'ramp',
            parts: [this.boxPart('box', x, base + H / 2, z, G, 0.2, Math.hypot(G, H), color, quat)],
            box,
            hp: opts.hp || 140,
            yieldMats: 8,
            base,
            level: true,
            ramp: { cx: x, cz: z, dx: DIRS[q][0], dz: DIRS[q][1], base },
            key: opts.key,
            built: opts.built
        });
    }

    rampHeight(pc, x, z) {
        const r = pc.ramp;
        const t = clamp(((x - r.cx) * r.dx + (z - r.cz) * r.dz) / G + 0.5, 0, 1);
        return r.base + 0.1 + t * H;
    }

    rayRamp(o, d, pc) {
        const r = pc.ramp;
        const k = H / G;
        const den = d.y - k * (d.x * r.dx + d.z * r.dz);
        if (Math.abs(den) < 1e-6) return null;
        const t = (r.base + 0.1 + 0.5 * H + k * ((o.x - r.cx) * r.dx + (o.z - r.cz) * r.dz) - o.y) / den;
        if (t < 0) return null;
        const px = o.x + d.x * t - r.cx;
        const pz = o.z + d.z * t - r.cz;
        if (Math.abs(px) > G / 2 + 0.01 || Math.abs(pz) > G / 2 + 0.01) return null;
        return t;
    }

    // ---------- world content ----------

    genPoi(poi, r) {
        const w = this.world;
        const B = w.build;
        const want = B.houses[0] + Math.floor(r() * (B.houses[1] - B.houses[0] + 1));
        const rects = [];
        for (let tries = 0; tries < 30 && rects.length < want; tries++) {
            const a = r() * Math.PI * 2;
            const d = rects.length === 0 ? r() * 4 : 9 + r() * 13;
            const wc = B.size[0] + Math.floor(r() * (B.size[1] - B.size[0] + 1));
            const dc = B.size[0] + Math.floor(r() * (B.size[1] - B.size[0] + 1));
            const ox = Math.floor((poi.x + Math.cos(a) * d) / G - wc / 2);
            const oz = Math.floor((poi.z + Math.sin(a) * d) / G - dc / 2);
            const rect = { ox, oz, wc, dc };
            if (rects.some((o) => ox < o.ox + o.wc + 1 && ox + wc + 1 > o.ox && oz < o.oz + o.dc + 1 && oz + dc + 1 > o.oz)) continue;
            rects.push(rect);
            let floors = B.floors[0] + Math.floor(r() * (B.floors[1] - B.floors[0] + 1));
            if (w.id === 'city' && rects.length === 1) floors = B.floors[1] + 1;
            this.genBuilding(rect, floors, poi.h, r);
        }
        poi.rects = rects;
    }

    genBuilding({ ox, oz, wc, dc }, floors, base, r) {
        const B = this.world.build;
        const stairs = floors > 1;
        const wallCol = () => vary(B.wall, 0.06, r);
        const doorEdge = Math.floor(r() * wc);
        const chestLevel = Math.floor(r() * floors);
        let chestPlaced = false;
        for (let L = 0; L < floors; L++) {
            const by = base + L * H;
            for (let cx = ox; cx < ox + wc; cx++)
                for (let cz = oz; cz < oz + dc; cz++) {
                    const isStair = stairs && cx === ox && cz === oz;
                    if (L === 0 || !isStair) this.addFloor(cx, cz, by, vary(B.floor, 0.05, r));
                    if (isStair && L < floors - 1) this.addRamp(cx, cz, L % 2 === 0 ? 0 : 2, by, vary(B.floor, 0.05, r));
                }
            const edges = [];
            for (let cx = ox; cx < ox + wc; cx++) {
                edges.push(['h', cx, oz, false]);
                edges.push(['h', cx, oz + dc, L === 0 && cx === ox + doorEdge]);
            }
            for (let cz = oz; cz < oz + dc; cz++) {
                edges.push(['v', ox, cz, false]);
                edges.push(['v', ox + wc, cz, false]);
            }
            for (const [line, lx, lz, door] of edges) {
                if (door) {
                    this.addWall(line, lx, lz, by + 2.4, H - 2.4, wallCol());
                    continue;
                }
                if (r() < (B.windows ? 0.55 : 0.28)) {
                    this.addWall(line, lx, lz, by, 1.1, wallCol());
                    this.addWall(line, lx, lz, by + 2.3, H - 2.3, wallCol());
                    if (B.windows) this.addWall(line, lx, lz, by + 1.1, 1.2, col(B.windows), { hp: 30, yieldMats: 0, level: false });
                } else this.addWall(line, lx, lz, by, H, wallCol());
            }
            if (!chestPlaced && L === chestLevel && r() < 0.8) {
                const cx = ox + wc - 1;
                const cz = oz + dc - 1;
                if (!(stairs && cx === ox && cz === oz)) {
                    this.addChest((cx + 0.5) * G, by, (cz + 0.5) * G, r() * Math.PI * 2);
                    chestPlaced = true;
                }
            }
        }
        const roofY = base + floors * H;
        for (let cx = ox; cx < ox + wc; cx++) for (let cz = oz; cz < oz + dc; cz++) this.addFloor(cx, cz, roofY, vary(B.roof, 0.04, r));
        if (!chestPlaced && r() < 0.5) this.addChest((ox + 0.5) * G + 0.8, roofY, (oz + 0.5) * G, 0);
        // floor loot inside
        const lx = (ox + wc - 0.5) * G - 0.8;
        const lz = (oz + 0.5) * G;
        this.spawnDrop(this.randomLoot(), lx, base, lz);
    }

    genNature(r) {
        const w = this.world;
        const nearPoi = (x, z, d) => this.pois.some((p) => Math.hypot(x - p.x, z - p.z) < d);
        let placed = 0;
        for (let i = 0; i < w.trees.count * 4 && placed < w.trees.count; i++) {
            const a = r() * Math.PI * 2;
            const d = Math.sqrt(r()) * (MAP_R - 8);
            const x = Math.cos(a) * d;
            const z = Math.sin(a) * d;
            const h = this.heightAt(x, z);
            if (h < w.waterLevel + 0.8 || nearPoi(x, z, 34)) continue;
            if (w.lava && Math.hypot(x, z) < 40) continue;
            this.addTree(w.trees.type, x, z, 0.8 + r() * 0.6, r);
            placed++;
        }
        placed = 0;
        for (let i = 0; i < w.rocks * 4 && placed < w.rocks; i++) {
            const a = r() * Math.PI * 2;
            const d = Math.sqrt(r()) * (MAP_R - 5);
            const x = Math.cos(a) * d;
            const z = Math.sin(a) * d;
            if (this.heightAt(x, z) < w.waterLevel + 0.3 || nearPoi(x, z, 30)) continue;
            this.addRock(x, z, 1.6 + r() * 2.6, r);
            placed++;
        }
    }

    addTree(type, x, z, s, r) {
        const y = this.heightAt(x, z) - 0.2;
        const parts = [];
        const trunk = '#6b4a2b';
        let top = 6 * s;
        const leaf = this.world.ground[1];
        const P = (b, px, py, pz, sx, sy, sz, color, quat) => parts.push(this.boxPart(b, x + px, y + py, z + pz, sx, sy, sz, vary(color, 0.08, r), quat));
        switch (type) {
            case 'round':
                P('cyl', 0, 1.6 * s, 0, 0.6 * s, 3.2 * s, 0.6 * s, trunk);
                P('blob', 0, 4.2 * s, 0, 4 * s, 3.6 * s, 4 * s, '#3f8f3a');
                P('blob', 0.4 * s, 5.8 * s, 0.2 * s, 2.8 * s, 2.4 * s, 2.8 * s, '#4ea546');
                top = 7 * s;
                break;
            case 'pine':
            case 'snowpine': {
                const snow = type === 'snowpine';
                P('cyl', 0, 1.2 * s, 0, 0.5 * s, 2.4 * s, 0.5 * s, trunk);
                P('cone', 0, 3.4 * s, 0, 3.8 * s, 3.2 * s, 3.8 * s, '#2f6b3a');
                P('cone', 0, 5.3 * s, 0, 3 * s, 2.8 * s, 3 * s, snow ? '#e8f0f6' : '#357a40');
                P('cone', 0, 7 * s, 0, 1.9 * s, 2.4 * s, 1.9 * s, snow ? '#f8fafc' : '#3d8a48');
                top = 8 * s;
                break;
            }
            case 'cactus': {
                P('cyl', 0, 2 * s, 0, 0.8 * s, 4 * s, 0.8 * s, '#3f8f4a');
                P('box', 0.75 * s, 2.2 * s, 0, 0.9 * s, 0.4 * s, 0.4 * s, '#3f8f4a');
                P('cyl', 1.1 * s, 2.9 * s, 0, 0.45 * s, 1.5 * s, 0.45 * s, '#3f8f4a');
                P('box', -0.7 * s, 1.6 * s, 0, 0.8 * s, 0.4 * s, 0.4 * s, '#3f8f4a');
                P('cyl', -1.0 * s, 2.2 * s, 0, 0.45 * s, 1.3 * s, 0.45 * s, '#3f8f4a');
                top = 4.1 * s;
                break;
            }
            case 'jungle':
                P('cyl', 0, 3.2 * s, 0, 0.8 * s, 6.4 * s, 0.8 * s, '#5b4030');
                P('blob', 0, 7 * s, 0, 6 * s, 3 * s, 6 * s, '#1f7a32');
                P('blob', 1.2 * s, 8.4 * s, -0.8 * s, 3.6 * s, 2.4 * s, 3.6 * s, '#2a9440');
                top = 9 * s;
                break;
            case 'dead': {
                P('cyl', 0, 2 * s, 0, 0.5 * s, 4 * s, 0.5 * s, '#2a211c');
                const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.8));
                const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.7, 0, -0.6));
                P('box', 0.7 * s, 3.4 * s, 0, 0.25 * s, 1.8 * s, 0.25 * s, '#2a211c', q1);
                P('box', -0.5 * s, 3.0 * s, 0.4 * s, 0.25 * s, 1.6 * s, 0.25 * s, '#2a211c', q2);
                top = 4.4 * s;
                break;
            }
            default:
                break;
        }
        const tw = type === 'jungle' ? 0.6 : 0.45;
        this.addPiece({
            kind: 'tree',
            parts,
            box: new THREE.Box3(new THREE.Vector3(x - tw * s, y, z - tw * s), new THREE.Vector3(x + tw * s, y + top, z + tw * s)),
            hp: 140 * s,
            yieldMats: 14
        });
    }

    addRock(x, z, s, r) {
        const y = this.heightAt(x, z);
        const sx = s * (1 + r() * 0.6);
        const sy = s * (0.6 + r() * 0.5);
        const sz = s * (1 + r() * 0.6);
        const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * Math.PI, 0));
        this.addPiece({
            kind: 'rock',
            parts: [this.boxPart('rock', x, y + sy * 0.25, z, sx, sy, sz, vary(this.world.rockColor, 0.1, r), quat)],
            box: new THREE.Box3(new THREE.Vector3(x - sx * 0.38, y - 1, z - sz * 0.38), new THREE.Vector3(x + sx * 0.38, y + sy * 0.68, z + sz * 0.38)),
            hp: 220 * s * 0.5,
            yieldMats: 16
        });
    }

    genFieldLoot() {
        for (let i = 0; i < 34; i++) {
            const a = Math.random() * Math.PI * 2;
            const d = Math.sqrt(Math.random()) * (MAP_R - 15);
            const x = Math.cos(a) * d;
            const z = Math.sin(a) * d;
            const h = this.heightAt(x, z);
            if (h < this.world.waterLevel + 0.4 || (this.world.lava && Math.hypot(x, z) < 22)) continue;
            this.spawnDrop(this.randomLoot(), x, h, z);
        }
        for (let i = 0; i < 9; i++) {
            const a = Math.random() * Math.PI * 2;
            const d = 30 + Math.random() * (MAP_R - 50);
            const x = Math.cos(a) * d;
            const z = Math.sin(a) * d;
            const h = this.heightAt(x, z);
            if (h < this.world.waterLevel + 0.4 || (this.world.lava && Math.hypot(x, z) < 25)) continue;
            this.addChest(x, this.groundAt(x, z, h + 20), z, Math.random() * 6);
        }
    }

    // ---------- items ----------

    rollRarity() {
        const w = this.world.rarity;
        let t = Math.random() * w.reduce((a, b) => a + b, 0);
        for (let i = 0; i < w.length; i++) {
            t -= w[i];
            if (t <= 0) return i;
        }
        return 0;
    }

    randomWeapon(rarity = this.rollRarity()) {
        const types = Object.keys(WEAPONS);
        let t = Math.random() * types.reduce((a, k) => a + WEAPONS[k].weight, 0);
        let type = types[0];
        for (const k of types) {
            t -= WEAPONS[k].weight;
            if (t <= 0) {
                type = k;
                break;
            }
        }
        return { kind: 'weapon', type, rarity, mag: WEAPONS[type].mag };
    }

    randomHeal() {
        const type = pick(['bandage', 'bandage', 'medkit', 'mini', 'mini', 'shield']);
        return { kind: 'heal', type, count: HEALS[type].pack };
    }

    randomLoot() {
        const r = Math.random();
        if (r < 0.5) return this.randomWeapon();
        if (r < 0.75) return this.randomHeal();
        if (r < 0.9) {
            const type = pick(Object.keys(AMMO));
            return { kind: 'ammo', type, count: AMMO[type].pack };
        }
        return { kind: 'mats', count: 30 };
    }

    itemColor(it) {
        if (it.kind === 'weapon') return RARITIES[it.rarity].color;
        if (it.kind === 'heal') return HEALS[it.type].color;
        if (it.kind === 'ammo') return AMMO[it.type].color;
        return '#c08b50';
    }

    itemName(it) {
        if (it.kind === 'weapon') return `${WEAPONS[it.type].name} ${RARITIES[it.rarity].name}`;
        if (it.kind === 'heal') return `${HEALS[it.type].name} ×${it.count}`;
        if (it.kind === 'ammo') return `${AMMO[it.type].name} ×${it.count}`;
        return `חומרי בנייה ×${it.count}`;
    }

    spawnDrop(item, x, y, z) {
        if (!item) return null;
        const c = this.itemColor(item);
        const mesh = makeLootMesh({ ...item, color: c }, c);
        const gy = this.groundAt(x, z, y + 1.5);
        mesh.position.set(x, gy + 0.75, z);
        this.scene.add(mesh);
        const d = { item, mesh, pos: new THREE.Vector3(x, gy, z), alive: true, phase: Math.random() * 6 };
        this.drops.push(d);
        return d;
    }

    removeDrop(d) {
        d.alive = false;
        this.scene.remove(d.mesh);
        const i = this.drops.indexOf(d);
        if (i >= 0) this.drops.splice(i, 1);
    }

    addChest(x, y, z, yaw) {
        const mesh = makeChest();
        mesh.position.set(x, y, z);
        mesh.rotation.y = yaw;
        this.scene.add(mesh);
        this.chests.push({ mesh, pos: new THREE.Vector3(x, y, z), opened: false, t: 0 });
    }

    openChest(ch, c) {
        if (ch.opened) return;
        ch.opened = true;
        ch.t = 0;
        if (this.distToPlayer(ch.pos.x, ch.pos.y, ch.pos.z) < 30) this.sfx.chest();
        const wpn = this.randomWeapon(Math.min(4, this.rollRarity() + (Math.random() < 0.4 ? 1 : 0)));
        const items = [wpn, { kind: 'ammo', type: WEAPONS[wpn.type].ammo, count: AMMO[WEAPONS[wpn.type].ammo].pack }, { kind: 'mats', count: 30 }];
        if (Math.random() < 0.7) items.push(this.randomHeal());
        items.forEach((it, i) => {
            const a = (i / items.length) * Math.PI * 2 + Math.random();
            const dx = Math.cos(a) * 1.3;
            const dz = Math.sin(a) * 1.3;
            const d = this.spawnDrop(it, ch.pos.x + dx, ch.pos.y + 0.5, ch.pos.z + dz);
            if (c.isBot && i === 0 && d) this.pickup(c, d);
        });
    }

    pickup(c, d) {
        const it = d.item;
        if (!d.alive) return false;
        if (it.kind === 'ammo') {
            c.ammo[it.type] += it.count;
        } else if (it.kind === 'mats') {
            c.mats = Math.min(999, c.mats + it.count);
        } else {
            if (it.kind === 'heal') {
                for (let i = 1; i < 6; i++) {
                    const s = c.slots[i];
                    if (s && s.kind === 'heal' && s.type === it.type && s.count < HEALS[it.type].stack) {
                        const add = Math.min(HEALS[it.type].stack - s.count, it.count);
                        s.count += add;
                        it.count -= add;
                    }
                }
                if (it.count <= 0) {
                    this.removeDrop(d);
                    if (c.isPlayer) this.sfx.pickup();
                    return true;
                }
            }
            let idx = c.slots.findIndex((s, i) => i > 0 && !s);
            if (idx < 0) {
                idx = c.active > 0 ? c.active : 1;
                const old = c.slots[idx];
                c.slots[idx] = null;
                this.spawnDrop(old, c.pos.x + (Math.random() - 0.5), c.pos.y, c.pos.z + (Math.random() - 0.5));
            }
            c.slots[idx] = it;
            if (c.isPlayer && c.active === 0 && it.kind === 'weapon') this.selectSlot(c, idx);
        }
        this.removeDrop(d);
        if (c.isPlayer) this.sfx.pickup();
        return true;
    }

    // ---------- characters ----------

    makeChar({ name, look, isPlayer }) {
        const model = makeCharacter(look);
        model.rotation.order = 'YXZ';
        model.visible = false;
        this.scene.add(model);
        const glider = makeGlider(look.accent || '#f59e0b');
        glider.visible = false;
        model.add(glider);
        const c = {
            id: this.chars.length,
            name,
            look,
            model,
            glider,
            isPlayer: !!isPlayer,
            isBot: !isPlayer,
            pos: new THREE.Vector3(),
            vel: new THREE.Vector3(),
            vy: 0,
            yaw: 0,
            grounded: false,
            groundPiece: null,
            hp: 100,
            shield: 0,
            alive: true,
            state: 'bus',
            slots: [{ kind: 'pickaxe' }, null, null, null, null, null],
            active: 0,
            ammo: { light: 0, medium: 0, heavy: 0, shells: 0 },
            mats: 0,
            fireCd: 0,
            reloadT: 0,
            reloadDur: 0,
            useT: 0,
            useDur: 0,
            swingT: 0,
            walk: 0,
            lastHurt: -99,
            lastAttacker: null,
            kills: 0,
            perks: { speed: 1, jump: 1, dmg: 1, storm: 1, harvest: 1, regen: false },
            deathT: 0
        };
        this.chars.push(c);
        return c;
    }

    initChars() {
        const def = this.charDef;
        const p = this.makeChar({ name: def.name, look: def.look, isPlayer: true });
        this.player = p;
        switch (def.perkKey) {
            case 'startWeapon':
                p.slots[1] = { kind: 'weapon', type: 'pistol', rarity: 1, mag: WEAPONS.pistol.mag };
                p.ammo.light = 48;
                break;
            case 'startShield':
                p.shield = 50;
                break;
            case 'builder':
                p.perks.harvest = 1.5;
                p.mats = 100;
                break;
            case 'speed':
                p.perks.speed = 1.12;
                break;
            case 'regen':
                p.perks.regen = true;
                break;
            case 'jump':
                p.perks.jump = 1.35;
                break;
            case 'storm':
                p.perks.storm = 0.5;
                break;
            case 'damage':
                p.perks.dmg = 1.12;
                break;
            default:
                break;
        }
        const names = [...BOT_NAMES].sort(() => Math.random() - 0.5);
        for (let i = 0; i < this.world.bots; i++) {
            const look = pick(CHARACTERS).look;
            const b = this.makeChar({ name: names[i % names.length], look });
            b.mats = 60;
            const poi = Math.random() < 0.75 ? pick(this.pois) : null;
            const a = Math.random() * Math.PI * 2;
            const land = poi
                ? { x: poi.x + Math.cos(a) * Math.random() * 18, z: poi.z + Math.sin(a) * Math.random() * 18 }
                : { x: Math.cos(a) * Math.random() * 140, z: Math.sin(a) * Math.random() * 140 };
            b.ai = {
                jumpAt: 1.5 + Math.random() * (this.bus.dur - 3),
                land,
                think: 0,
                target: null,
                goal: null,
                mode: '',
                react: 0,
                strafe: 1,
                strafeT: 0,
                fireDelay: 0,
                buildCd: 0,
                stuckT: 0,
                stuck: 0,
                lastPos: new THREE.Vector3()
            };
        }
        this.aliveCount = this.chars.length;
        this.total = this.chars.length;
    }

    jumpFromBus(c) {
        c.state = 'dive';
        c.pos.copy(this.bus.pos);
        c.pos.y -= 7;
        c.vy = -12;
        c.model.visible = true;
        if (c.isPlayer) {
            this.message('קפצת!', 'החלק לכיוון המקום שתבחר — המצנח ייפתח לבד');
        }
    }

    selectSlot(c, i) {
        if (i !== 0 && !c.slots[i]) return;
        if (c.active !== i) {
            c.reloadT = 0;
            c.useT = 0;
        }
        c.active = i;
        if (c.isPlayer) this.buildMode = false;
    }

    // ---------- physics ----------

    groundAt(x, z, feetY, c) {
        let g = this.heightAt(x, z);
        let gp = null;
        const lists = this.near(x, z, 0.1, _lists);
        for (const arr of lists)
            for (const pc of arr) {
                const b = pc.box;
                if (x < b.min.x - 0.05 || x > b.max.x + 0.05 || z < b.min.z - 0.05 || z > b.max.z + 0.05) continue;
                let top;
                if (pc.ramp) top = this.rampHeight(pc, x, z);
                else if (pc.solid && pc.kind !== 'tree') top = b.max.y;
                else continue;
                if (top <= feetY + STEP && top > g) {
                    g = top;
                    gp = pc;
                }
            }
        if (c) c.groundPiece = gp;
        return g;
    }

    collide(c) {
        const p = c.pos;
        const lists = this.near(p.x, p.z, RAD + 0.5, _lists2);
        for (let pass = 0; pass < 2; pass++)
            for (const arr of lists)
                for (const pc of arr) {
                    if (pc.ramp || !pc.solid) continue;
                    const b = pc.box;
                    if (b.max.y <= p.y + STEP || b.min.y >= p.y + HGT) continue;
                    if (p.x + RAD <= b.min.x || p.x - RAD >= b.max.x || p.z + RAD <= b.min.z || p.z - RAD >= b.max.z) continue;
                    const px1 = p.x + RAD - b.min.x;
                    const px2 = b.max.x - (p.x - RAD);
                    const pz1 = p.z + RAD - b.min.z;
                    const pz2 = b.max.z - (p.z - RAD);
                    const m = Math.min(px1, px2, pz1, pz2);
                    if (m === px1) p.x -= px1;
                    else if (m === px2) p.x += px2;
                    else if (m === pz1) p.z -= pz1;
                    else p.z += pz2;
                }
    }

    moveChar(c, dt) {
        if (c.state === 'bus') return;
        const p = c.pos;
        if (c.state === 'dive' || c.state === 'glide') {
            p.x += c.vel.x * dt;
            p.z += c.vel.z * dt;
            p.y += c.vy * dt;
            const g = this.groundAt(p.x, p.z, p.y, c);
            if (c.state === 'dive' && p.y - g < 34) c.state = 'glide';
            if (p.y <= g) {
                p.y = g;
                c.state = 'ground';
                c.vy = 0;
                c.grounded = true;
                if (c.isPlayer) this.onLand();
            }
            this.clampBounds(c);
            return;
        }
        p.x += c.vel.x * dt;
        p.z += c.vel.z * dt;
        this.collide(c);
        this.clampBounds(c);
        if (c.vy > 0) {
            const lists = this.near(p.x, p.z, 0.5, _lists);
            for (const arr of lists)
                for (const pc of arr) {
                    if (pc.ramp || !pc.solid) continue;
                    const b = pc.box;
                    if (p.x < b.min.x - 0.2 || p.x > b.max.x + 0.2 || p.z < b.min.z - 0.2 || p.z > b.max.z + 0.2) continue;
                    const head = p.y + HGT;
                    if (b.min.y >= head - 0.1 && b.min.y < head + c.vy * dt + 0.05) c.vy = 0;
                }
        }
        const g = this.groundAt(p.x, p.z, p.y, c);
        c.vy -= GRAV * dt;
        p.y += c.vy * dt;
        if (p.y <= g) {
            p.y = g;
            c.vy = 0;
            c.grounded = true;
        } else if (c.grounded && c.vy <= 0 && p.y - g < 0.7) {
            p.y = g;
            c.vy = 0;
        } else c.grounded = false;
    }

    clampBounds(c) {
        const d = Math.hypot(c.pos.x, c.pos.z);
        const max = MAP_R + 30;
        if (d > max) {
            c.pos.x *= max / d;
            c.pos.z *= max / d;
        }
    }

    tickChar(c, dt) {
        c.fireCd -= dt;
        if (c.swingT > 0) c.swingT -= dt;
        if (c.reloadT > 0) {
            c.reloadT -= dt;
            if (c.reloadT <= 0) this.finishReload(c);
        }
        if (c.useT > 0) {
            c.useT -= dt;
            if (c.useT <= 0) this.finishUse(c);
        }
        if (c.perks.regen && this.time - c.lastHurt > 5 && c.hp < 100) c.hp = Math.min(100, c.hp + dt * 1.5);
        if (this.world.lava && c.state === 'ground' && c.pos.y < this.lavaY + 0.4 && Math.hypot(c.pos.x, c.pos.z) < 15) {
            c.lavaAcc = (c.lavaAcc || 0) + dt;
            if (c.lavaAcc > 0.25) {
                c.lavaAcc = 0;
                this.damageChar(c, 6, null, 'lava', false, true);
            }
        }
    }

    // ---------- combat ----------

    raycast(o, d, maxD, ignore, worldOnly) {
        let best = maxD;
        let piece = null;
        for (const pc of this.pieces) {
            const vx = pc.cx - o.x;
            const vy = pc.cy - o.y;
            const vz = pc.cz - o.z;
            const proj = vx * d.x + vy * d.y + vz * d.z;
            if (proj < -pc.rad || proj - pc.rad > best) continue;
            if (vx * vx + vy * vy + vz * vz - proj * proj > pc.rad * pc.rad) continue;
            const b = pc.box;
            let t = rayBox(o, d, b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z);
            if (t === null || t > best) continue;
            if (pc.ramp) {
                t = this.rayRamp(o, d, pc);
                if (t === null || t > best) continue;
            }
            best = t;
            piece = pc;
        }
        let ch = null;
        if (!worldOnly)
            for (const c of this.chars) {
                if (c === ignore || !c.alive || c.state === 'bus') continue;
                const p = c.pos;
                const t = rayBox(o, d, p.x - 0.42, p.y, p.z - 0.42, p.x + 0.42, p.y + HGT, p.z + 0.42);
                if (t !== null && t < best) {
                    best = t;
                    ch = c;
                    piece = null;
                }
            }
        const tt = this.rayTerrain(o, d, best);
        if (tt !== null && tt < best) {
            best = tt;
            ch = null;
            piece = null;
            return { type: 'terrain', t: best, point: o.clone().addScaledVector(d, best) };
        }
        const point = o.clone().addScaledVector(d, best);
        if (ch) return { type: 'char', t: best, point, char: ch, head: point.y - ch.pos.y > 1.5 };
        if (piece) return { type: 'piece', t: best, point, piece };
        return { type: null, t: best, point };
    }

    rayTerrain(o, d, maxD) {
        const gap = (t) => o.y + d.y * t - this.heightAt(o.x + d.x * t, o.z + d.z * t);
        if (gap(0) < 0) return null;
        let t = 0;
        let prev = 0;
        while (t < maxD) {
            const g = gap(t);
            if (g < 0) {
                let a = prev;
                let b = t;
                for (let i = 0; i < 7; i++) {
                    const m = (a + b) / 2;
                    if (gap(m) < 0) b = m;
                    else a = m;
                }
                return b;
            }
            prev = t;
            t += Math.max(0.4, g * 0.5);
        }
        return null;
    }

    los(a, b) {
        const o = _v3.set(a.pos.x, a.pos.y + 1.6, a.pos.z);
        const d = _v4.set(b.pos.x - o.x, b.pos.y + 1.2 - o.y, b.pos.z - o.z);
        const dist = d.length();
        d.divideScalar(dist);
        return this.raycast(o, d, dist, a, true).type === null;
    }

    fire(c, origin, dir) {
        const it = c.slots[c.active];
        if (!it || it.kind !== 'weapon') return false;
        const W = WEAPONS[it.type];
        if (c.fireCd > 0 || c.reloadT > 0) return false;
        if (it.mag <= 0) {
            this.startReload(c);
            return false;
        }
        c.useT = 0;
        it.mag--;
        c.fireCd = 1 / W.rate;
        let spread = W.spread;
        if (c.isPlayer) {
            const moving = Math.hypot(c.vel.x, c.vel.z) > 1;
            spread *= (this.aiming ? 0.45 : 1) * (moving ? 1.5 : 1) * (c.grounded ? 1 : 2.2);
            if (W.zoom && !this.aiming) spread = 0.06;
        }
        const rm = RARITIES[it.rarity].mult;
        const muzzle = origin.clone().addScaledVector(dir, 0.7);
        for (let i = 0; i < W.pellets; i++) {
            const d = spreadDir(dir, spread, new THREE.Vector3());
            const res = this.raycast(origin, d, W.range, c);
            this.tracer(muzzle, res.point, it.type === 'sniper' ? '#fff7c2' : '#ffd36b');
            if (res.type === 'char') {
                let dmg = W.dmg * rm * c.perks.dmg * (res.head ? W.headMult : 1);
                if (it.type === 'shotgun') dmg *= clamp(1 - (res.t - 8) / 40, 0.35, 1);
                if (c.isBot && res.char.isPlayer) dmg *= this.world.botDmg;
                this.damageChar(res.char, dmg, c, it.type, res.head);
                this.burst(res.point, 'ff4444', 3, 2);
            } else if (res.type === 'piece') {
                this.damagePiece(res.piece, W.dmg * rm * (it.type === 'shotgun' ? 0.8 : 1));
                this.burst(res.point, res.piece.parts[0]?.color.getHexString() || 'cccccc', 2, 2);
            } else if (res.type === 'terrain') {
                this.burst(res.point, '8a7a60', 2, 1.5);
            }
        }
        const dist = this.distToPlayer(origin.x, origin.y, origin.z);
        this.sfx.shot(it.type, c.isPlayer ? 0 : dist);
        if (c.isPlayer) {
            this.pitch += W.zoom ? 0.03 : it.type === 'shotgun' ? 0.04 : 0.008;
            this.yaw += (Math.random() - 0.5) * 0.006;
        }
        if (it.mag === 0) this.startReload(c);
        return true;
    }

    swing(c, dir) {
        c.fireCd = 1 / PICKAXE.rate;
        c.swingT = 0.4;
        const o = _v3.set(c.pos.x, c.pos.y + 1.45, c.pos.z);
        const res = this.raycast(o, dir, PICKAXE.range, c);
        if (res.type === 'char') {
            this.damageChar(res.char, PICKAXE.dmg * c.perks.dmg, c, 'pickaxe', false);
        } else if (res.type === 'piece') {
            const pc = res.piece;
            this.damagePiece(pc, 50);
            if (pc.yieldMats) c.mats = Math.min(999, c.mats + Math.round(pc.yieldMats * c.perks.harvest));
            this.burst(res.point, pc.parts[0]?.color.getHexString() || 'aaaaaa', 4, 2.5);
            if (c.isPlayer || this.distToPlayer(o.x, o.y, o.z) < 25) this.sfx.pick();
        }
    }

    startReload(c) {
        const it = c.slots[c.active];
        if (!it || it.kind !== 'weapon' || c.reloadT > 0) return;
        const W = WEAPONS[it.type];
        if (it.mag >= W.mag) return;
        if (c.isPlayer && c.ammo[W.ammo] <= 0) {
            this.toast('אין תחמושת לנשק הזה');
            return;
        }
        c.reloadDur = W.reload * (1 - 0.04 * it.rarity);
        c.reloadT = c.reloadDur;
        if (c.isPlayer) this.sfx.reload();
    }

    finishReload(c) {
        const it = c.slots[c.active];
        if (!it || it.kind !== 'weapon') return;
        const W = WEAPONS[it.type];
        const need = W.mag - it.mag;
        const take = c.isBot ? need : Math.min(need, c.ammo[W.ammo]);
        if (!c.isBot) c.ammo[W.ammo] -= take;
        it.mag += take;
        if (c.isPlayer) this.sfx.reload();
    }

    startUse(c) {
        const it = c.slots[c.active];
        if (!it || it.kind !== 'heal' || c.useT > 0) return false;
        const Hh = HEALS[it.type];
        const useful = Hh.hp ? c.hp < Hh.cap : c.shield < Hh.cap;
        if (!useful) {
            if (c.isPlayer) this.toast(Hh.hp ? 'הבריאות כבר מלאה' : 'המגן כבר מלא');
            return false;
        }
        c.useT = c.useDur = Hh.time;
        return true;
    }

    finishUse(c) {
        const it = c.slots[c.active];
        if (!it || it.kind !== 'heal') return;
        const Hh = HEALS[it.type];
        if (Hh.hp) c.hp = Math.max(c.hp, Math.min(Hh.cap, c.hp + Hh.hp));
        else c.shield = Math.max(c.shield, Math.min(Hh.cap, c.shield + Hh.shield));
        it.count--;
        if (it.count <= 0) {
            c.slots[c.active] = null;
            c.active = 0;
        }
        if (c.isPlayer) this.sfx.pickup();
    }

    damageChar(t, dmg, attacker, cause, head, ignoreShield) {
        if (!t.alive || t.state === 'bus') return;
        dmg = Math.max(1, Math.round(dmg));
        let rem = dmg;
        let toShield = 0;
        if (!ignoreShield) {
            toShield = Math.min(t.shield, rem);
            t.shield -= toShield;
            rem -= toShield;
        }
        t.hp -= rem;
        t.lastHurt = this.time;
        if (attacker) t.lastAttacker = attacker;
        if (attacker?.isPlayer) {
            this.stats.dmg += dmg;
            this.hitmarker = 0.2;
            this.hitHead = head;
            this.sfx.hit(head);
            this.dmgNums.push({
                x: t.pos.x + (Math.random() - 0.5) * 0.6,
                y: t.pos.y + 2.1,
                z: t.pos.z,
                text: String(dmg),
                color: head ? '#ffd23f' : toShield > 0 ? '#7cc4ff' : '#ffffff',
                big: head,
                life: 0
            });
        }
        if (t.isPlayer) {
            this.hurtFlash = Math.min(1, this.hurtFlash + dmg / 35);
            if (attacker) this.hurtFrom = { x: attacker.pos.x, z: attacker.pos.z, t: 1.2 };
        }
        if (t.isBot && attacker && attacker !== t && t.ai && !t.ai.target) t.ai.think = 0;
        if (t.hp <= 0) this.kill(t, attacker, cause);
    }

    kill(t, attacker, cause) {
        t.alive = false;
        t.hp = 0;
        t.useT = 0;
        t.reloadT = 0;
        this.aliveCount--;
        const place = this.aliveCount + 1;
        for (let i = 1; i < 6; i++) {
            const it = t.slots[i];
            if (!it) continue;
            const a = Math.random() * Math.PI * 2;
            this.spawnDrop(it, t.pos.x + Math.cos(a) * 1.2, t.pos.y + 0.5, t.pos.z + Math.sin(a) * 1.2);
            if (t.isBot && it.kind === 'weapon') {
                const am = WEAPONS[it.type].ammo;
                this.spawnDrop({ kind: 'ammo', type: am, count: AMMO[am].pack }, t.pos.x - Math.cos(a), t.pos.y + 0.5, t.pos.z - Math.sin(a));
            }
        }
        if (t.mats > 0) this.spawnDrop({ kind: 'mats', count: Math.min(100, t.mats) }, t.pos.x, t.pos.y + 0.5, t.pos.z);
        let text;
        if (attacker && attacker !== t) {
            attacker.kills++;
            const icon = cause === 'pickaxe' ? '⛏️' : WEAPONS[cause]?.icon || '💥';
            text = `${attacker.name} ${icon} ${t.name}`;
        } else if (cause === 'storm') text = `${t.name} נבלע/ה בסערה 🌀`;
        else if (cause === 'lava') text = `${t.name} נפל/ה ללבה 🌋`;
        else text = `${t.name} חוסל/ה`;
        this.killfeed.push({ text, t: this.time, mine: attacker?.isPlayer || t.isPlayer });
        if (this.killfeed.length > 6) this.killfeed.shift();
        if (attacker?.isPlayer && !t.isPlayer) {
            this.sfx.elim();
            this.elimMsg = { text: `חיסלת את ${t.name}`, sub: `נשארו ${this.aliveCount} שחקנים`, t: 2.2 };
        }
        if (t.isPlayer) {
            this.place = place;
            this.killer = attacker && attacker !== t ? attacker.name : null;
            this.message(`חוסלת! מקום #${place}`, this.killer ? `${this.killer} חיסל/ה אותך` : text, 4);
            this.endT = 3.5;
            this.buildMode = false;
            if (document.pointerLockElement) document.exitPointerLock?.();
        } else if (this.player.alive && this.aliveCount === 1) {
            this.won = true;
            this.place = 1;
            this.message('#1 ניצחון אגדי!', 'נשארת אחרון/ה על האי', 5);
            this.sfx.victory();
            this.endT = 5;
        }
    }

    // ---------- building ----------

    placement(c, type) {
        const yaw = c.isPlayer ? this.yaw : c.yaw;
        const fx = -Math.sin(yaw);
        const fz = -Math.cos(yaw);
        const q = Math.abs(fx) > Math.abs(fz) ? (fx > 0 ? 1 : 3) : fz < 0 ? 0 : 2;
        const D = DIRS[q];
        const pcx = Math.floor(c.pos.x / G);
        const pcz = Math.floor(c.pos.z / G);
        const feet = c.pos.y;
        let tcx = pcx + D[0];
        let tcz = pcz + D[1];
        if (type === 'floor' && c.isPlayer && this.pitch < -0.7) {
            tcx = pcx;
            tcz = pcz;
        }
        let base = null;
        let skirt = 0;
        const gp = c.groundPiece;
        if (gp && gp.alive && gp.level && gp.base !== null) {
            if (gp.ramp) base = type === 'wall' ? gp.base : gp.base + H;
            else if (gp.kind === 'floor') base = gp.base;
        }
        if (base === null) {
            const tx = (tcx + 0.5) * G;
            const tz = (tcz + 0.5) * G;
            let bestA = null;
            for (const arr of this.near(tx, tz, G * 1.2, _lists))
                for (const pc of arr) {
                    if (!pc.level || pc.base === null || Math.abs(pc.cx - tx) > G * 1.2 || Math.abs(pc.cz - tz) > G * 1.2) continue;
                    for (const a of [pc.base, pc.base + H]) {
                        if (type === 'wall') {
                            if (a <= feet + 0.5 && a >= feet - H * 0.9 && (bestA === null || a > bestA)) bestA = a;
                        } else if (a >= feet - 0.9 && a <= feet + 1.2 && (bestA === null || a < bestA)) bestA = a;
                    }
                }
            if (bestA !== null) base = bestA;
            else {
                base = feet - 0.05;
                if (type === 'wall') skirt = 2.5;
            }
        }
        const bk = Math.round(base * 4);
        if (type === 'wall') {
            let line;
            let lx;
            let lz;
            if (q === 0) [line, lx, lz] = ['h', pcx, pcz];
            else if (q === 2) [line, lx, lz] = ['h', pcx, pcz + 1];
            else if (q === 1) [line, lx, lz] = ['v', pcx + 1, pcz];
            else [line, lx, lz] = ['v', pcx, pcz];
            const key = `w:${line}:${lx}:${lz}:${bk}`;
            const hh = H + skirt;
            const pos = line === 'h' ? new THREE.Vector3((lx + 0.5) * G, base - skirt + hh / 2, lz * G) : new THREE.Vector3(lx * G, base - skirt + hh / 2, (lz + 0.5) * G);
            const scale = line === 'h' ? new THREE.Vector3(G, hh, 0.3) : new THREE.Vector3(0.3, hh, G);
            return { type, key, pos, scale, quat: IDQ, base, line, lx, lz, skirt, valid: !this.occupied.has(key) };
        }
        if (type === 'floor') {
            const key = `f:${tcx}:${tcz}:${bk}`;
            return {
                type,
                key,
                pos: new THREE.Vector3((tcx + 0.5) * G, base - 0.1, (tcz + 0.5) * G),
                scale: new THREE.Vector3(G, 0.2, G),
                quat: IDQ,
                base,
                tcx,
                tcz,
                valid: !this.occupied.has(key)
            };
        }
        const key = `r:${tcx}:${tcz}:${bk}`;
        return {
            type,
            key,
            pos: new THREE.Vector3((tcx + 0.5) * G, base + H / 2, (tcz + 0.5) * G),
            scale: new THREE.Vector3(G, 0.2, Math.hypot(G, H)),
            quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.atan(H / G), RAMP_YAW[q], 0, 'YXZ')),
            base,
            q,
            tcx,
            tcz,
            valid: !this.occupied.has(key)
        };
    }

    buildPieceAt(c, type) {
        if (c.mats < BUILD_COST) {
            if (c.isPlayer) this.toast('אין מספיק חומרים — כרה עצים, סלעים וקירות עם המכוש');
            return false;
        }
        const pl = this.placement(c, type);
        if (!pl.valid) return false;
        const color = col('#c08b50');
        const opts = { key: pl.key, built: true, hp: BUILD_PIECES[type].hp };
        if (type === 'wall') this.addWall(pl.line, pl.lx, pl.lz, pl.base, H, color, { ...opts, skirt: pl.skirt, yieldMats: 0 });
        else if (type === 'floor') this.addFloor(pl.tcx, pl.tcz, pl.base, color, opts);
        else this.addRamp(pl.tcx, pl.tcz, pl.q, pl.base, color, opts);
        c.mats -= BUILD_COST;
        if (this.distToPlayer(c.pos.x, c.pos.y, c.pos.z) < 40) this.sfx.build();
        return true;
    }

    updateGrowing(dt) {
        for (let i = this.growing.length - 1; i >= 0; i--) {
            const pc = this.growing[i];
            if (!pc.alive) {
                this.growing.splice(i, 1);
                continue;
            }
            pc.grow = Math.min(1, pc.grow + dt * 5);
            const k = lerp(0.2, 1, pc.grow);
            for (const p of pc.parts) {
                _m.compose(p.pos, p.quat, _s.copy(p.scale).multiplyScalar(k));
                this.buckets[p.b].set(p.i, _m);
            }
            if (pc.grow >= 1) this.growing.splice(i, 1);
        }
    }

    // ---------- storm ----------

    initStorm() {
        const st = { cx: 0, cz: 0, r: 340, phase: 0, state: 'wait', t: STORM_PHASES[0].wait, fx: 0, fz: 0, fr: 340, acc: 0 };
        this.storm = st;
        this.nextCircle();
    }

    nextCircle() {
        const st = this.storm;
        const ph = STORM_PHASES[st.phase];
        const room = st.phase === 0 ? 50 : Math.max(0, st.r - ph.r);
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * room;
        st.tx = st.phase === 0 ? Math.cos(a) * d : st.cx + Math.cos(a) * d;
        st.tz = st.phase === 0 ? Math.sin(a) * d : st.cz + Math.sin(a) * d;
        st.tr = ph.r;
    }

    updateStorm(dt) {
        const st = this.storm;
        if (st.state !== 'done') {
            st.t -= dt;
            if (st.state === 'wait' && st.t <= 0) {
                st.state = 'shrink';
                st.t = STORM_PHASES[st.phase].shrink;
                st.fx = st.cx;
                st.fz = st.cz;
                st.fr = st.r;
                if (this.player.alive) this.message('הסערה מתכווצת!', 'היכנס למעגל הבטוח', 2.5);
            } else if (st.state === 'shrink') {
                const k = 1 - Math.max(0, st.t) / STORM_PHASES[st.phase].shrink;
                st.cx = lerp(st.fx, st.tx, k);
                st.cz = lerp(st.fz, st.tz, k);
                st.r = lerp(st.fr, st.tr, k);
                if (st.t <= 0) {
                    st.phase++;
                    if (st.phase < STORM_PHASES.length) {
                        st.state = 'wait';
                        st.t = STORM_PHASES[st.phase].wait;
                        this.nextCircle();
                    } else st.state = 'done';
                }
            }
        }
        this.stormMesh.position.x = st.cx;
        this.stormMesh.position.z = st.cz;
        const sr = Math.max(0.5, st.r);
        this.stormMesh.scale.set(sr, 1, sr);
        this.stormMesh.visible = sr < MAP_R + 60;
        st.acc += dt;
        const p = this.player;
        this.inStorm = p.alive && p.state === 'ground' && Math.hypot(p.pos.x - st.cx, p.pos.z - st.cz) > st.r;
        if (st.acc >= 1) {
            st.acc -= 1;
            const dps = STORM_PHASES[Math.min(st.phase, STORM_PHASES.length - 1)].dps;
            for (const c of this.chars) {
                if (!c.alive || c.state !== 'ground') continue;
                if (Math.hypot(c.pos.x - st.cx, c.pos.z - st.cz) > st.r) this.damageChar(c, dps * c.perks.storm, null, 'storm', false, true);
            }
        }
    }

    // ---------- bots ----------

    hasWeapon(c) {
        return c.slots.some((s) => s && s.kind === 'weapon');
    }

    botChooseWeapon(b, d) {
        let best = 0;
        let bestScore = 0;
        for (let i = 1; i < 6; i++) {
            const s = b.slots[i];
            if (!s || s.kind !== 'weapon') continue;
            const W = WEAPONS[s.type];
            let score = W.dmg * W.pellets * Math.min(W.rate, 3) * RARITIES[s.rarity].mult;
            if (s.type === 'shotgun') score *= d < 10 ? 3 : d < 20 ? 0.6 : 0.05;
            if (s.type === 'sniper') score *= d > 50 ? 2 : 0.3;
            if (d > W.range * 0.8) score *= 0.1;
            if (score > bestScore) {
                bestScore = score;
                best = i;
            }
        }
        if (best !== b.active && b.reloadT <= 0) this.selectSlot(b, best);
    }

    botTryHeal(b) {
        for (let i = 1; i < 6; i++) {
            const s = b.slots[i];
            if (!s || s.kind !== 'heal') continue;
            const Hh = HEALS[s.type];
            if ((Hh.hp && b.hp < Math.min(Hh.cap, 80)) || (Hh.shield && b.shield < Hh.cap - 10)) {
                this.selectSlot(b, i);
                return this.startUse(b);
            }
        }
        return false;
    }

    botThink(b) {
        const ai = b.ai;
        const cands = [];
        for (const c of this.chars) {
            if (c === b || !c.alive || c.state !== 'ground') continue;
            const d = Math.hypot(c.pos.x - b.pos.x, c.pos.z - b.pos.z);
            const revenge = c === b.lastAttacker && this.time - b.lastHurt < 5;
            if (d < 70 || (revenge && d < 160)) cands.push([revenge ? d * 0.3 : d, c]);
        }
        cands.sort((x, y) => x[0] - y[0]);
        let target = null;
        for (let i = 0; i < Math.min(3, cands.length); i++) {
            if (this.los(b, cands[i][1])) {
                target = cands[i][1];
                break;
            }
        }
        const armed = this.hasWeapon(b);
        if (target && !armed && Math.hypot(target.pos.x - b.pos.x, target.pos.z - b.pos.z) > 14) target = null;
        if (target !== ai.target) {
            if (target) ai.react = this.world.react * (0.6 + Math.random() * 0.8);
            ai.target = target;
        }
        if (target) {
            ai.goal = null;
            this.botChooseWeapon(b, Math.hypot(target.pos.x - b.pos.x, target.pos.z - b.pos.z));
            return;
        }
        if (b.useT > 0) return;
        if (this.botTryHeal(b)) return;
        if (armed) this.botChooseWeapon(b, 30);
        const st = this.storm;
        const sc = st.state === 'wait' ? { x: st.tx, z: st.tz, r: st.tr } : { x: st.cx, z: st.cz, r: st.r };
        const ds = Math.hypot(b.pos.x - sc.x, b.pos.z - sc.z);
        const urgent = st.state !== 'wait' || st.t < 30 || Math.hypot(b.pos.x - st.cx, b.pos.z - st.cz) > st.r;
        if (ds > sc.r * 0.85 && urgent) {
            if (ai.mode !== 'storm' || !ai.goal) {
                const a = Math.random() * Math.PI * 2;
                const rr = Math.random() * sc.r * 0.5;
                ai.goal = { x: sc.x + Math.cos(a) * rr, z: sc.z + Math.sin(a) * rr };
                ai.mode = 'storm';
            }
            return;
        }
        if (ai.mode === 'storm' || ai.mode === 'hunt') ai.goal = null;
        if (!ai.goal || ai.mode === 'wander') {
            let best = null;
            let bd = armed ? 45 : 110;
            for (const ch of this.chests) {
                if (ch.opened || Math.abs(ch.pos.y - b.pos.y) > 2.5) continue;
                const d = Math.hypot(ch.pos.x - b.pos.x, ch.pos.z - b.pos.z);
                if (d < bd) {
                    bd = d;
                    best = ch;
                }
            }
            for (const dr of this.drops) {
                if (dr.item.kind !== 'weapon' && (dr.item.kind !== 'heal' || !armed)) continue;
                if (Math.abs(dr.pos.y - b.pos.y) > 2.5) continue;
                const d = Math.hypot(dr.pos.x - b.pos.x, dr.pos.z - b.pos.z) * (dr.item.kind === 'weapon' ? 0.8 : 1.2);
                if (d < bd) {
                    bd = d;
                    best = dr;
                }
            }
            if (best) {
                ai.goal = { x: best.pos.x, z: best.pos.z, ref: best };
                ai.mode = 'loot';
                return;
            }
        }
        if (armed && (!ai.goal || ai.mode === 'wander') && (st.phase >= 2 || Math.random() < 0.15)) {
            let prey = null;
            let pd = st.phase >= 2 ? 220 : 120;
            for (const c of this.chars) {
                if (c === b || !c.alive || c.state !== 'ground') continue;
                const d = Math.hypot(c.pos.x - b.pos.x, c.pos.z - b.pos.z);
                if (d < pd) {
                    pd = d;
                    prey = c;
                }
            }
            if (prey) {
                ai.goal = { x: prey.pos.x + (Math.random() - 0.5) * 6, z: prey.pos.z + (Math.random() - 0.5) * 6 };
                ai.mode = 'hunt';
                return;
            }
        }
        if (!ai.goal) {
            const a = Math.random() * Math.PI * 2;
            const rr = Math.random() * Math.min(45, sc.r * 0.7);
            let gx = b.pos.x + Math.cos(a) * rr;
            let gz = b.pos.z + Math.sin(a) * rr;
            if (Math.hypot(gx - sc.x, gz - sc.z) > sc.r * 0.8) {
                gx = sc.x + Math.cos(a) * sc.r * 0.4;
                gz = sc.z + Math.sin(a) * sc.r * 0.4;
            }
            ai.goal = { x: gx, z: gz };
            ai.mode = 'wander';
        }
    }

    botArrive(b) {
        const ai = b.ai;
        const ref = ai.goal?.ref;
        if (ai.mode === 'loot' && ref) {
            if (ref.mesh && 'opened' in ref) {
                if (!ref.opened && ref.pos.distanceTo(b.pos) < 3.5) this.openChest(ref, b);
            } else if (ref.alive && ref.pos.distanceTo(b.pos) < 3) this.pickup(b, ref);
        }
        ai.goal = null;
    }

    updateBot(b, dt) {
        const ai = b.ai;
        if (b.state === 'bus') {
            if (this.bus.t >= ai.jumpAt) this.jumpFromBus(b);
            return;
        }
        if (b.state === 'dive' || b.state === 'glide') {
            const dx = ai.land.x - b.pos.x;
            const dz = ai.land.z - b.pos.z;
            const d = Math.hypot(dx, dz);
            const sp = Math.min(d * 2, b.state === 'dive' ? 17 : 11.5);
            b.vel.x = d > 0.1 ? (dx / d) * sp : 0;
            b.vel.z = d > 0.1 ? (dz / d) * sp : 0;
            b.vy = b.state === 'dive' ? -26 : -6.5;
            if (d > 1) b.yaw = Math.atan2(-dx, -dz);
            return;
        }
        ai.think -= dt;
        ai.strafeT -= dt;
        ai.buildCd -= dt;
        ai.react -= dt;
        ai.fireDelay -= dt;
        if (ai.think <= 0) {
            ai.think = 0.3 + Math.random() * 0.2;
            this.botThink(b);
        }
        let mx = 0;
        let mz = 0;
        let speed = 5.8;
        const t = ai.target;
        if (t && t.alive) {
            const dx = t.pos.x - b.pos.x;
            const dz = t.pos.z - b.pos.z;
            const d = Math.max(0.01, Math.hypot(dx, dz));
            b.yaw = angleTo(b.yaw, Math.atan2(-dx, -dz), dt * 7);
            const it = b.slots[b.active];
            const ideal = it?.kind !== 'weapon' ? 1.2 : { shotgun: 4, smg: 10, pistol: 15, ar: 22, sniper: 55 }[it.type];
            const ux = dx / d;
            const uz = dz / d;
            const fwd = d > ideal + 4 ? 1 : d < ideal - 4 ? -0.7 : 0;
            if (ai.strafeT <= 0) {
                ai.strafe = Math.random() < 0.5 ? -1 : 1;
                ai.strafeT = 0.7 + Math.random() * 1.4;
                if (Math.random() < 0.3 && b.grounded) b.vy = JUMP;
            }
            mx = ux * fwd - uz * ai.strafe * 0.8;
            mz = uz * fwd + ux * ai.strafe * 0.8;
            if (ai.react <= 0) {
                if (it?.kind === 'weapon') {
                    if (b.reloadT <= 0 && b.fireCd <= 0 && ai.fireDelay <= 0) {
                        const W = WEAPONS[it.type];
                        const o = new THREE.Vector3(b.pos.x, b.pos.y + 1.45, b.pos.z);
                        const aimY = t.pos.y + (Math.random() < 0.12 ? 1.65 : 1.1);
                        const dir = new THREE.Vector3(t.pos.x - o.x, aimY - o.y, t.pos.z - o.z).normalize();
                        const err = this.world.aim * (1 + d / 90) * (t.grounded ? 1 : 1.4) * (b.grounded ? 1 : 1.5) * (Math.hypot(t.vel.x, t.vel.z) > 3 ? 1.25 : 1);
                        spreadDir(dir, err, dir);
                        this.fire(b, o, dir);
                        ai.burst = (ai.burst || 0) + 1;
                        if (W.auto) {
                            if (ai.burst > 4 + Math.random() * 6) {
                                ai.burst = 0;
                                ai.fireDelay = 0.4 + Math.random() * 0.6;
                            }
                        } else ai.fireDelay = 0.12 + Math.random() * 0.35;
                    }
                } else if (it?.kind === 'pickaxe' && d < 2.6 && b.fireCd <= 0) {
                    this.swing(b, new THREE.Vector3(dx / d, (t.pos.y - b.pos.y) / d, dz / d).normalize());
                }
            }
            if (this.world.botBuild > 0 && ai.buildCd <= 0 && this.time - b.lastHurt < 0.4 && b.mats >= BUILD_COST && d > 6) {
                ai.buildCd = 2.5 + Math.random() * 3;
                if (Math.random() < this.world.botBuild) this.buildPieceAt(b, 'wall');
            }
        } else if (ai.goal) {
            const dx = ai.goal.x - b.pos.x;
            const dz = ai.goal.z - b.pos.z;
            const d = Math.hypot(dx, dz);
            if (d < 1.6) this.botArrive(b);
            else {
                mx = dx / d;
                mz = dz / d;
                b.yaw = angleTo(b.yaw, Math.atan2(-dx, -dz), dt * 6);
            }
            if (ai.mode === 'storm') speed = 6.8;
        }
        if (b.useT > 0) speed *= 0.45;
        b.vel.x = mx * speed;
        b.vel.z = mz * speed;
        ai.stuckT += dt;
        if (ai.stuckT > 1.2) {
            const moved = Math.hypot(b.pos.x - ai.lastPos.x, b.pos.z - ai.lastPos.z);
            if ((mx || mz) && moved < 1) {
                if (b.grounded) b.vy = JUMP;
                ai.stuck++;
                if (ai.stuck > 2) {
                    const a = Math.random() * Math.PI * 2;
                    ai.goal = { x: b.pos.x + Math.cos(a) * 12, z: b.pos.z + Math.sin(a) * 12 };
                    ai.mode = 'wander';
                    ai.stuck = 0;
                }
            } else ai.stuck = 0;
            ai.lastPos.copy(b.pos);
            ai.stuckT = 0;
        }
    }

    // ---------- player ----------

    onLand() {
        const poi = this.nearestPoi(this.player.pos, 45);
        this.message(poi ? poi.name : this.world.name, poi ? 'נחתת! חפש תיבות זהב ונשקים' : 'נחתת! חפש נשק', 3);
    }

    nearestPoi(p, maxD) {
        let best = null;
        let bd = maxD;
        for (const poi of this.pois) {
            const d = Math.hypot(poi.x - p.x, poi.z - p.z);
            if (d < bd) {
                bd = d;
                best = poi;
            }
        }
        return best;
    }

    computeCamDir() {
        const cp = Math.cos(this.pitch);
        this.camDir.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
    }

    updatePlayer(dt) {
        const p = this.player;
        const inp = this.input;
        const P = this.pressed;
        const btn = inp.btn;
        if (P.has('KeyM') || btn.has('map')) this.showMap = !this.showMap;
        const it = p.slots[p.active];
        const scoped = this.aiming && it?.kind === 'weapon' && WEAPONS[it.type].zoom;
        const s = this.sens * (scoped ? 0.3 : this.aiming ? 0.65 : 1);
        this.yaw -= inp.lookDX * s;
        this.pitch = clamp(this.pitch - inp.lookDY * s, -1.45, 1.35);
        inp.lookDX = 0;
        inp.lookDY = 0;
        this.computeCamDir();
        if (!p.alive) return;

        const K = this.keys;
        let f = (K.has('KeyW') || K.has('ArrowUp') ? 1 : 0) - (K.has('KeyS') || K.has('ArrowDown') ? 1 : 0) - inp.joyY;
        let st = (K.has('KeyD') || K.has('ArrowRight') ? 1 : 0) - (K.has('KeyA') || K.has('ArrowLeft') ? 1 : 0) + inp.joyX;
        f = clamp(f, -1, 1);
        st = clamp(st, -1, 1);
        const fx = -Math.sin(this.yaw);
        const fz = -Math.cos(this.yaw);
        const rx = Math.cos(this.yaw);
        const rz = -Math.sin(this.yaw);
        let mx = fx * f + rx * st;
        let mz = fz * f + rz * st;
        const ml = Math.hypot(mx, mz);
        if (ml > 1) {
            mx /= ml;
            mz /= ml;
        }
        const jump = P.has('Space') || btn.has('jump');

        if (p.state === 'bus') {
            if ((jump && this.bus.t > 1.2) || this.bus.t > this.bus.dur - 0.5) this.jumpFromBus(p);
            return;
        }
        if (p.state === 'dive' || p.state === 'glide') {
            const sp = p.state === 'dive' ? 17 : 11.5;
            p.vel.x = mx * sp;
            p.vel.z = mz * sp;
            p.vy = p.state === 'dive' ? (f > 0.3 && this.pitch < -0.5 ? -40 : -24) : -6.5;
            p.yaw = this.yaw;
            return;
        }

        this.aiming = inp.aim && !this.buildMode;
        const inWater = p.pos.y < this.world.waterLevel - 0.5;
        const speed = 7 * p.perks.speed * (p.useT > 0 ? 0.45 : 1) * (this.aiming ? 0.7 : 1) * (inWater ? 0.6 : 1) * (K.has('ShiftLeft') ? 1.2 : 1);
        const k = Math.min(1, dt * (p.grounded ? 14 : 4));
        p.vel.x = lerp(p.vel.x, mx * speed, k);
        p.vel.z = lerp(p.vel.z, mz * speed, k);
        if (jump && p.grounded) {
            p.vy = JUMP * p.perks.jump;
            p.grounded = false;
        }
        p.yaw = this.yaw;

        for (let i = 0; i < 6; i++) if (P.has('Digit' + (i + 1))) this.selectSlot(p, i);
        if (P.has('KeyF')) this.selectSlot(p, 0);
        if (btn.has('slot')) this.cycleSlot(1);
        if (inp.wheel) {
            this.cycleSlot(inp.wheel > 0 ? 1 : -1);
            inp.wheel = 0;
        }
        if (P.has('KeyQ') || btn.has('build')) this.buildMode = !this.buildMode;
        if (P.has('KeyZ')) this.setBuild('wall');
        if (P.has('KeyX')) this.setBuild('floor');
        if (P.has('KeyC')) this.setBuild('ramp');
        if (btn.has('piece')) {
            const order = ['wall', 'floor', 'ramp'];
            this.setBuild(order[(order.indexOf(this.buildPiece) + 1) % 3]);
        }
        if (P.has('KeyR') || btn.has('reload')) this.startReload(p);
        if (P.has('KeyE') || btn.has('interact')) this.interact(p);
        if (P.has('KeyH')) this.quickHeal(p);

        this.buildCd -= dt;
        this.fireQueued -= dt;
        if (inp.firePressed) this.fireQueued = 0.18;
        const cur = p.slots[p.active] || p.slots[0];
        if (this.buildMode) {
            if (inp.fire && this.buildCd <= 0) this.buildCd = this.buildPieceAt(p, this.buildPiece) ? 0.12 : 0.05;
        } else if (cur.kind === 'pickaxe') {
            if (inp.fire && p.fireCd <= 0) this.swing(p, this.camDir);
        } else if (cur.kind === 'weapon') {
            const W = WEAPONS[cur.type];
            if ((W.auto ? inp.fire : this.fireQueued > 0) && p.fireCd <= 0 && p.reloadT <= 0) {
                if (cur.mag > 0) {
                    this.updateCamera(0);
                    this.playerShoot(p);
                    this.fireQueued = 0;
                } else if (inp.firePressed) this.startReload(p);
            }
        } else if (cur.kind === 'heal') {
            if (inp.firePressed && p.useT <= 0) this.startUse(p);
        }

        // prompt and auto pickup
        this.prompt = null;
        let nearChest = null;
        let cd = 2.8;
        for (const ch of this.chests) {
            if (ch.opened) continue;
            const d = ch.pos.distanceTo(p.pos);
            if (d < cd) {
                cd = d;
                nearChest = ch;
            }
        }
        let nearDrop = null;
        let dd = 2.3;
        for (const d of this.drops) {
            const dist = d.pos.distanceTo(p.pos);
            if ((d.item.kind === 'ammo' || d.item.kind === 'mats') && dist < 1.6) {
                this.pickup(p, d);
                continue;
            }
            if (dist < dd) {
                dd = dist;
                nearDrop = d;
            }
        }
        this.nearChest = nearChest;
        this.nearDrop = nearDrop;
        if (nearChest) this.prompt = { key: 'E', text: 'פתח תיבת אוצר' };
        else if (nearDrop) this.prompt = { key: 'E', text: `אסוף ${this.itemName(nearDrop.item)}`, color: this.itemColor(nearDrop.item) };
    }

    setBuild(piece) {
        this.buildMode = true;
        this.buildPiece = piece;
    }

    cycleSlot(dir) {
        const p = this.player;
        for (let k = 1; k <= 6; k++) {
            const i = (p.active + dir * k + 12) % 6;
            if (i === 0 || p.slots[i]) {
                this.selectSlot(p, i);
                return;
            }
        }
    }

    quickHeal(p) {
        for (let i = 1; i < 6; i++) {
            const s = p.slots[i];
            if (s?.kind === 'heal') {
                this.selectSlot(p, i);
                if (this.startUse(p)) return;
            }
        }
    }

    interact(p) {
        if (this.nearChest) this.openChest(this.nearChest, p);
        else if (this.nearDrop) this.pickup(p, this.nearDrop);
    }

    playerShoot(p) {
        const rx = Math.cos(this.yaw);
        const rz = -Math.sin(this.yaw);
        const aim = this.raycast(this.camPos, this.camDir, 600, p);
        const origin = new THREE.Vector3(p.pos.x + rx * 0.3, p.pos.y + 1.45, p.pos.z + rz * 0.3);
        const dir = aim.point.clone().sub(origin);
        if (dir.dot(this.camDir) < 0.2 || dir.lengthSq() < 1) dir.copy(this.camDir);
        dir.normalize();
        this.fire(p, origin, dir);
    }

    // ---------- loop ----------

    loop(now) {
        this.raf = requestAnimationFrame(this.loop);
        const dt = Math.min(0.05, (now - this.last) / 1000);
        this.last = now;
        if (!this.paused && !this.ended) {
            this.update(dt);
        }
        this.updateCamera(dt);
        for (const k in this.buckets) this.buckets[k].flush();
        this.renderer.render(this.scene, this.camera);
        this.drawOverlay(dt);
        this.hudT -= dt;
        if (this.hudT <= 0 && this.opts.onHud) {
            this.hudT = 0.1;
            this.opts.onHud(this.hud());
        }
    }

    update(dt) {
        this.time += dt;
        const bus = this.bus;
        bus.t += dt;
        bus.pos.copy(bus.start).addScaledVector(bus.dir, bus.speed * bus.t);
        this.airship.position.copy(bus.pos);
        this.airship.userData.prop.rotation.z += dt * 12;
        if (bus.t > bus.dur + 8) this.airship.visible = false;

        this.updatePlayer(dt);
        for (const c of this.chars) if (c.isBot && c.alive) this.updateBot(c, dt);
        for (const c of this.chars) {
            if (c.alive) {
                this.tickChar(c, dt);
                this.moveChar(c, dt);
            }
            this.animateChar(c, dt);
        }
        this.updateStorm(dt);
        this.updateDrops(dt);
        this.updateGrowing(dt);
        this.updateEffects(dt);
        this.updateGhost();
        if (this.endT !== null) {
            this.endT -= dt;
            if (this.endT <= 0) this.finish();
        }
        this.pressed.clear();
        this.input.firePressed = false;
        this.input.btn.clear();
    }

    animateChar(c, dt) {
        const m = c.model;
        if (!c.alive) {
            c.deathT += dt;
            m.rotation.x = Math.min(1, c.deathT * 2.5) * (Math.PI / 2);
            c.glider.visible = false;
            if (c.deathT > 2.5 && !c.isPlayer) m.visible = false;
            m.position.copy(c.pos);
            return;
        }
        m.visible = c.state !== 'bus' && !(c.isPlayer && this.aiming && this.isScoped());
        m.position.copy(c.pos);
        m.rotation.y = c.yaw;
        m.rotation.x = c.state === 'dive' ? -1.1 : 0;
        c.glider.visible = c.state === 'glide';
        const sp = Math.hypot(c.vel.x, c.vel.z);
        c.walk += dt * sp * 1.7;
        const it = c.slots[c.active];
        let holding = 'none';
        if (c.isPlayer && this.buildMode) holding = 'none';
        else if (it?.kind === 'pickaxe') holding = 'pick';
        else if (it?.kind === 'weapon') holding = 'gun';
        else if (it?.kind === 'heal') holding = 'heal';
        let key = 'none';
        let mesh = null;
        if (holding === 'pick') {
            key = 'pick';
            if (m.userData.heldKey !== key) mesh = makeWeaponMesh('pickaxe');
        } else if (holding === 'gun') {
            key = `${it.type}:${it.rarity}`;
            if (m.userData.heldKey !== key) mesh = makeWeaponMesh(it.type, RARITIES[it.rarity].color);
        }
        if (m.userData.heldKey !== key) setHeld(m, key, mesh);
        poseCharacter(m, {
            walk: c.walk,
            moving: sp > 0.5 && c.grounded,
            airborne: c.state === 'ground' && !c.grounded,
            holding,
            swing: c.swingT / 0.4,
            pitch: c.isPlayer ? this.pitch * 0.7 : 0,
            diving: c.state === 'dive',
            build: c.isPlayer && this.buildMode
        });
    }

    isScoped() {
        const it = this.player.slots[this.player.active];
        return this.aiming && it?.kind === 'weapon' && !!WEAPONS[it.type].zoom;
    }

    updateCamera(dt) {
        const p = this.player;
        this.computeCamDir();
        const d = this.camDir;
        const cam = this.camera;
        let targetFov = 75;
        if (p.state === 'bus') {
            this.camPos.copy(this.bus.pos).addScaledVector(d, -55).add(_v1.set(0, 8, 0));
        } else {
            const rx = Math.cos(this.yaw);
            const rz = -Math.sin(this.yaw);
            const diving = p.state !== 'ground';
            const dist = diving ? 7 : this.aiming ? 2.2 : 3.6;
            const shoulder = _v2.set(p.pos.x + rx * (diving ? 0 : 0.75), p.pos.y + (diving ? 2.2 : 1.7), p.pos.z + rz * (diving ? 0 : 0.75));
            const back = _v3.copy(d).negate();
            let t = dist;
            if (!diving) {
                const res = this.raycast(shoulder, back, dist + 0.3, p, true);
                if (res.type) t = Math.max(0.4, res.t - 0.3);
            }
            this.camPos.copy(shoulder).addScaledVector(back, t);
            const gh = this.heightAt(this.camPos.x, this.camPos.z) + 0.4;
            if (this.camPos.y < gh) this.camPos.y = gh;
            if (this.aiming) targetFov = this.isScoped() ? 22 : 58;
        }
        if (!p.alive) {
            this.deathCam = (this.deathCam || 0) + dt;
            this.camPos.y += Math.min(6, this.deathCam * 3);
        }
        cam.position.copy(this.camPos);
        cam.lookAt(_v1.copy(this.camPos).add(d));
        if (dt > 0 && Math.abs(this.camera.fov - targetFov) > 0.1) {
            this.camera.fov = lerp(this.camera.fov, targetFov, Math.min(1, dt * 14));
            this.camera.updateProjectionMatrix();
        }
    }

    updateGhost() {
        const p = this.player;
        if (!this.buildMode || !p.alive || p.state !== 'ground') {
            this.ghost.visible = false;
            return;
        }
        const pl = this.placement(p, this.buildPiece);
        this.ghost.visible = true;
        this.ghost.position.copy(pl.pos);
        this.ghost.quaternion.copy(pl.quat);
        this.ghost.scale.copy(pl.scale);
        this.ghost.material.color.set(pl.valid && p.mats >= BUILD_COST ? '#4aa8ff' : '#ff4a4a');
    }

    updateDrops(dt) {
        for (const d of this.drops) {
            d.mesh.position.y = d.pos.y + 0.75 + Math.sin(this.time * 2 + d.phase) * 0.12;
            d.mesh.rotation.y += dt * 1.2;
        }
        const cm = lambert('#d99a1e', '#f59e0b');
        cm.emissiveIntensity = 0.35 + Math.sin(this.time * 4) * 0.25;
        for (let i = this.chests.length - 1; i >= 0; i--) {
            const ch = this.chests[i];
            if (!ch.opened) continue;
            ch.t += dt;
            ch.mesh.userData.lid.rotation.x = -Math.min(1, ch.t * 4) * 1.9;
            if (ch.t > 4) {
                this.scene.remove(ch.mesh);
                this.chests.splice(i, 1);
            }
        }
    }

    // ---------- effects ----------

    initEffects() {
        this.partGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
        this.tracerPool = [];
        for (let i = 0; i < 40; i++) {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
            const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#ffd36b', transparent: true, opacity: 0, fog: false }));
            l.frustumCulled = false;
            this.scene.add(l);
            this.tracerPool.push({ line: l, life: 0 });
        }
        this.tracerIdx = 0;
    }

    tracer(a, b, color) {
        const t = this.tracerPool[this.tracerIdx++ % this.tracerPool.length];
        const arr = t.line.geometry.attributes.position.array;
        arr[0] = a.x;
        arr[1] = a.y;
        arr[2] = a.z;
        arr[3] = b.x;
        arr[4] = b.y;
        arr[5] = b.z;
        t.line.geometry.attributes.position.needsUpdate = true;
        t.line.material.color.set(color);
        t.line.material.opacity = 0.9;
        t.life = 0.08;
    }

    burst(p, hex, n, speed) {
        for (let i = 0; i < n; i++) {
            let part;
            if (this.particles.length > 140) {
                part = this.particles.shift();
                part.mesh.material = lambert('#' + hex);
            } else {
                part = { mesh: new THREE.Mesh(this.partGeo, lambert('#' + hex)) };
                this.scene.add(part.mesh);
            }
            part.mesh.position.copy(p);
            part.mesh.visible = true;
            part.vel = new THREE.Vector3((Math.random() - 0.5) * speed * 2, Math.random() * speed * 1.5, (Math.random() - 0.5) * speed * 2);
            part.life = 0.6 + Math.random() * 0.4;
            this.particles.push(part);
        }
    }

    updateEffects(dt) {
        for (const t of this.tracerPool) {
            if (t.life > 0) {
                t.life -= dt;
                t.line.material.opacity = Math.max(0, t.life / 0.08) * 0.9;
            }
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            p.vel.y -= 14 * dt;
            p.mesh.position.addScaledVector(p.vel, dt);
            p.mesh.rotation.x += dt * 5;
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.particles.splice(i, 1);
            }
        }
        for (let i = this.dmgNums.length - 1; i >= 0; i--) {
            this.dmgNums[i].life += dt;
            if (this.dmgNums[i].life > 0.9) this.dmgNums.splice(i, 1);
        }
        if (this.hitmarker > 0) this.hitmarker -= dt;
        if (this.hurtFlash > 0) this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.2);
        if (this.hurtFrom) {
            this.hurtFrom.t -= dt;
            if (this.hurtFrom.t <= 0) this.hurtFrom = null;
        }
        if (this.msg) {
            this.msg.t -= dt;
            if (this.msg.t <= 0) this.msg = null;
        }
        if (this.elimMsg) {
            this.elimMsg.t -= dt;
            if (this.elimMsg.t <= 0) this.elimMsg = null;
        }
        if (this.toastMsg) {
            this.toastMsg.t -= dt;
            if (this.toastMsg.t <= 0) this.toastMsg = null;
        }
    }

    message(text, sub, t = 2.5) {
        this.msg = { text, sub, t };
    }

    toast(text) {
        this.toastMsg = { text, t: 1.8 };
    }

    distToPlayer(x, y, z) {
        const p = this.player.pos;
        return Math.hypot(p.x - x, p.y - y, p.z - z);
    }

    // ---------- overlay (crosshair, minimap, damage numbers) ----------

    makeMapImage() {
        const S = 256;
        const cv = document.createElement('canvas');
        cv.width = S;
        cv.height = S;
        const ctx = cv.getContext('2d');
        const img = ctx.createImageData(S, S);
        const c = new THREE.Color();
        const wc = new THREE.Color(this.world.water);
        for (let py = 0; py < S; py++)
            for (let px = 0; px < S; px++) {
                const x = -MAP_EXT + ((px + 0.5) / S) * MAP_EXT * 2;
                const z = -MAP_EXT + ((py + 0.5) / S) * MAP_EXT * 2;
                const h = this.heightAt(x, z);
                if (h < this.world.waterLevel) c.copy(wc).multiplyScalar(0.85 + Math.max(-0.3, h / 30));
                else this.terrainColor(h, x, z, c);
                const i = (py * S + px) * 4;
                c.convertLinearToSRGB();
                img.data[i] = Math.round(clamp(c.r, 0, 1) * 255);
                img.data[i + 1] = Math.round(clamp(c.g, 0, 1) * 255);
                img.data[i + 2] = Math.round(clamp(c.b, 0, 1) * 255);
                img.data[i + 3] = 255;
            }
        ctx.putImageData(img, 0, 0);
        ctx.fillStyle = 'rgba(60,60,70,0.75)';
        for (const poi of this.pois)
            for (const r of poi.rects || []) {
                const x = ((r.ox * G + MAP_EXT) / (MAP_EXT * 2)) * S;
                const y = ((r.oz * G + MAP_EXT) / (MAP_EXT * 2)) * S;
                ctx.fillRect(x, y, ((r.wc * G) / (MAP_EXT * 2)) * S, ((r.dc * G) / (MAP_EXT * 2)) * S);
            }
        this.mapImg = cv;
    }

    drawMap(ctx, x, y, size, big) {
        const toS = (wx, wz) => [x + ((wx + MAP_EXT) / (MAP_EXT * 2)) * size, y + ((wz + MAP_EXT) / (MAP_EXT * 2)) * size];
        const sc = size / (MAP_EXT * 2);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, big ? 16 : 10);
        ctx.clip();
        ctx.drawImage(this.mapImg, x, y, size, size);
        const st = this.storm;
        const [sx, sy] = toS(st.cx, st.cz);
        ctx.beginPath();
        ctx.rect(x, y, size, size);
        ctx.moveTo(sx + st.r * sc, sy);
        ctx.arc(sx, sy, Math.max(0.1, st.r * sc), 0, Math.PI * 2, true);
        ctx.fillStyle = 'rgba(120,40,210,0.45)';
        ctx.fill('evenodd');
        if (st.state === 'wait') {
            const [tx, ty] = toS(st.tx, st.tz);
            ctx.beginPath();
            ctx.arc(tx, ty, st.tr * sc, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = big ? 2.5 : 1.5;
            ctx.stroke();
        }
        const p = this.player;
        if (p.state === 'bus') {
            const [ax, ay] = toS(this.bus.start.x, this.bus.start.z);
            const [bx, by] = toS(this.bus.end.x, this.bus.end.z);
            ctx.setLineDash([6, 5]);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        if (big) {
            ctx.font = 'bold 14px Heebo, sans-serif';
            ctx.textAlign = 'center';
            for (const poi of this.pois) {
                const [px, py] = toS(poi.x, poi.z);
                ctx.lineWidth = 4;
                ctx.strokeStyle = 'rgba(0,0,0,0.7)';
                ctx.strokeText(poi.name, px, py);
                ctx.fillStyle = '#fff';
                ctx.fillText(poi.name, px, py);
            }
        }
        const ppos = p.state === 'bus' ? this.bus.pos : p.pos;
        const [mx, my] = toS(ppos.x, ppos.z);
        const ang = Math.atan2(-Math.sin(this.yaw), -Math.cos(this.yaw));
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(ang + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(5.5, 6);
        ctx.lineTo(0, 3);
        ctx.lineTo(-5.5, 6);
        ctx.closePath();
        ctx.fillStyle = '#ffd23f';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, big ? 16 : 10);
        ctx.stroke();
    }

    drawOverlay() {
        const ctx = this.ctx;
        const W = this.vw;
        const Hh = this.vh;
        ctx.clearRect(0, 0, W, Hh);
        const p = this.player;
        if (this.inStorm) {
            ctx.fillStyle = 'rgba(130,40,210,0.22)';
            ctx.fillRect(0, 0, W, Hh);
        }
        if (this.hurtFlash > 0) {
            const g = ctx.createRadialGradient(W / 2, Hh / 2, Math.min(W, Hh) * 0.3, W / 2, Hh / 2, Math.max(W, Hh) * 0.7);
            g.addColorStop(0, 'rgba(255,0,0,0)');
            g.addColorStop(1, `rgba(255,0,0,${this.hurtFlash * 0.55})`);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, Hh);
        }
        const cx = W / 2;
        const cy = Hh / 2;
        if (p.alive && p.state === 'ground' && !this.showMap) {
            if (this.isScoped()) {
                const r = Math.min(W, Hh) * 0.42;
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.rect(0, 0, W, Hh);
                ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
                ctx.fill('evenodd');
                ctx.strokeStyle = 'rgba(0,0,0,0.85)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx - r, cy);
                ctx.lineTo(cx + r, cy);
                ctx.moveTo(cx, cy - r);
                ctx.lineTo(cx, cy + r);
                ctx.stroke();
                ctx.fillStyle = '#ff3b3b';
                ctx.beginPath();
                ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                const it = p.slots[p.active];
                let gap = 6;
                if (it?.kind === 'weapon') {
                    const W2 = WEAPONS[it.type];
                    gap = 4 + W2.spread * 260 * (this.aiming ? 0.45 : 1) * (Math.hypot(p.vel.x, p.vel.z) > 1 ? 1.5 : 1);
                }
                if (it?.kind === 'weapon' && it.type === 'shotgun') {
                    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(cx, cy, gap + 6, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.strokeStyle = 'rgba(0,0,0,0.6)';
                ctx.lineWidth = 4;
                this.crossLines(ctx, cx, cy, gap);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                this.crossLines(ctx, cx, cy, gap);
            }
            if (this.hitmarker > 0) {
                ctx.strokeStyle = this.hitHead ? '#ffd23f' : '#ffffff';
                ctx.lineWidth = 2.5;
                const a = 7;
                const b = 14;
                ctx.beginPath();
                for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
                    ctx.moveTo(cx + sx * a, cy + sy * a);
                    ctx.lineTo(cx + sx * b, cy + sy * b);
                }
                ctx.stroke();
            }
        }
        if (this.hurtFrom && p.alive) {
            const ang = Math.atan2(this.hurtFrom.x - p.pos.x, this.hurtFrom.z - p.pos.z);
            const rel = ang - Math.atan2(-Math.sin(this.yaw), -Math.cos(this.yaw));
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-rel);
            ctx.fillStyle = `rgba(255,50,50,${Math.min(1, this.hurtFrom.t) * 0.8})`;
            ctx.beginPath();
            ctx.moveTo(0, -95);
            ctx.lineTo(14, -75);
            ctx.lineTo(-14, -75);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        ctx.textAlign = 'center';
        for (const n of this.dmgNums) {
            const v = _v1.set(n.x, n.y + n.life * 1.2, n.z).project(this.camera);
            if (v.z > 1) continue;
            const sx = ((v.x + 1) / 2) * W;
            const sy = ((1 - v.y) / 2) * Hh;
            ctx.globalAlpha = Math.min(1, (0.9 - n.life) * 3);
            ctx.font = `900 ${n.big ? 26 : 20}px Heebo, sans-serif`;
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.strokeText(n.text, sx, sy);
            ctx.fillStyle = n.color;
            ctx.fillText(n.text, sx, sy);
        }
        ctx.globalAlpha = 1;
        const small = W < 700;
        const ms = small ? 112 : 176;
        if (!this.showMap) this.drawMap(ctx, W - ms - 14, 14, ms, false);
        else {
            const s = Math.min(W, Hh) * 0.86;
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(0, 0, W, Hh);
            this.drawMap(ctx, (W - s) / 2, (Hh - s) / 2, s, true);
        }
    }

    crossLines(ctx, cx, cy, gap) {
        const l = 8;
        ctx.beginPath();
        ctx.moveTo(cx - gap - l, cy);
        ctx.lineTo(cx - gap, cy);
        ctx.moveTo(cx + gap, cy);
        ctx.lineTo(cx + gap + l, cy);
        ctx.moveTo(cx, cy - gap - l);
        ctx.lineTo(cx, cy - gap);
        ctx.moveTo(cx, cy + gap);
        ctx.lineTo(cx, cy + gap + l);
        ctx.stroke();
    }

    hud() {
        const p = this.player;
        const it = p.slots[p.active];
        const st = this.storm;
        let stormText;
        if (st.state === 'wait') stormText = `הסערה מתכווצת בעוד ${fmtTime(st.t)}`;
        else if (st.state === 'shrink') stormText = `הסערה מתכווצת! ${fmtTime(st.t)}`;
        else stormText = 'המעגל האחרון';
        const poi = p.state === 'ground' ? this.nearestPoi(p.pos, 40) : null;
        return {
            state: p.state,
            alive: p.alive,
            hp: Math.ceil(p.hp),
            shield: Math.ceil(p.shield),
            mats: p.mats,
            players: this.aliveCount,
            kills: p.kills,
            stormText,
            stormPhase: st.phase,
            inStorm: this.inStorm,
            location: poi ? poi.name : this.world.name,
            slots: p.slots.map((s) => {
                if (!s) return null;
                if (s.kind === 'pickaxe') return { icon: '⛏️', name: 'מכוש', color: '#94a3b8' };
                if (s.kind === 'weapon') return { icon: WEAPONS[s.type].icon, name: WEAPONS[s.type].name, color: RARITIES[s.rarity].color, mag: s.mag, type: s.type };
                return { icon: HEALS[s.type].icon, name: HEALS[s.type].name, color: '#e5e7eb', count: s.count };
            }),
            active: p.active,
            ammo: it?.kind === 'weapon' ? { mag: it.mag, max: WEAPONS[it.type].mag, reserve: p.ammo[WEAPONS[it.type].ammo] } : null,
            reload: p.reloadT > 0 ? 1 - p.reloadT / p.reloadDur : null,
            use: p.useT > 0 ? { name: HEALS[it.type]?.name, progress: 1 - p.useT / p.useDur } : null,
            build: this.buildMode ? this.buildPiece : null,
            prompt: this.prompt,
            killfeed: this.killfeed.filter((k) => this.time - k.t < 8).map((k) => ({ text: k.text, mine: k.mine, id: k.t })),
            msg: this.msg,
            elim: this.elimMsg,
            toast: this.toastMsg?.text || null,
            showMap: this.showMap,
            paused: this.paused,
            started: this.started,
            scoped: this.isScoped(),
            busJump: p.state === 'bus' && this.bus.t > 1.2
        };
    }

    finish() {
        if (this.ended) return;
        this.ended = true;
        if (document.pointerLockElement) document.exitPointerLock?.();
        this.opts.onEnd?.({
            won: this.won,
            place: this.place || this.aliveCount,
            kills: this.player.kills,
            damage: this.stats.dmg,
            total: this.total,
            worldIndex: this.worldIndex,
            seconds: Math.round(this.time)
        });
    }

    // ---------- input ----------

    initInput() {
        this.onKeyDown = (e) => {
            if (this.ended) return;
            if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
            if (!this.keys.has(e.code)) this.pressed.add(e.code);
            this.keys.add(e.code);
        };
        this.onKeyUp = (e) => this.keys.delete(e.code);
        this.onMouseDown = (e) => {
            if (this.ended || this.touch) return;
            if (!document.pointerLockElement) {
                this.canvas.requestPointerLock?.();
                this.sfx.resume();
                return;
            }
            if (e.button === 0) {
                this.input.fire = true;
                this.input.firePressed = true;
            } else if (e.button === 2) this.input.aim = true;
        };
        this.onMouseUp = (e) => {
            if (e.button === 0) this.input.fire = false;
            else if (e.button === 2) this.input.aim = false;
        };
        this.onMouseMove = (e) => {
            if (document.pointerLockElement !== this.canvas) return;
            this.input.lookDX += e.movementX;
            this.input.lookDY += e.movementY;
        };
        this.onWheel = (e) => {
            if (document.pointerLockElement) this.input.wheel += Math.sign(e.deltaY);
        };
        this.onLockChange = () => {
            if (this.touch || this.ended || this.endT !== null) return;
            const locked = document.pointerLockElement === this.canvas;
            this.paused = !locked;
            if (locked) {
                this.started = true;
                this.pressed.clear();
            }
            if (!locked) {
                this.input.fire = false;
                this.input.aim = false;
                this.keys.clear();
            }
        };
        this.onContext = (e) => e.preventDefault();
        this.onBlur = () => this.keys.clear();
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        window.addEventListener('blur', this.onBlur);
        this.canvas.addEventListener('mousedown', this.onMouseDown);
        window.addEventListener('mouseup', this.onMouseUp);
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('wheel', this.onWheel, { passive: true });
        document.addEventListener('pointerlockchange', this.onLockChange);
        this.canvas.addEventListener('contextmenu', this.onContext);

        // touch: left side is a joystick, right side drags the camera
        this.joy = null;
        this.look = null;
        this.onTouchStart = (e) => {
            for (const t of e.changedTouches) {
                if (t.target !== this.canvas) continue;
                if (t.clientX < this.vw * 0.4 && !this.joy) this.joy = { id: t.identifier, sx: t.clientX, sy: t.clientY };
                else if (!this.look) this.look = { id: t.identifier, x: t.clientX, y: t.clientY };
            }
            this.sfx.resume();
        };
        this.onTouchMove = (e) => {
            for (const t of e.changedTouches) {
                if (this.joy && t.identifier === this.joy.id) {
                    const dx = t.clientX - this.joy.sx;
                    const dy = t.clientY - this.joy.sy;
                    const l = Math.hypot(dx, dy);
                    const m = Math.min(1, l / 55);
                    this.input.joyX = l > 0 ? (dx / l) * m : 0;
                    this.input.joyY = l > 0 ? (dy / l) * m : 0;
                    this.joy.cx = t.clientX;
                    this.joy.cy = t.clientY;
                } else if (this.look && t.identifier === this.look.id) {
                    this.input.lookDX += (t.clientX - this.look.x) * 2;
                    this.input.lookDY += (t.clientY - this.look.y) * 2;
                    this.look.x = t.clientX;
                    this.look.y = t.clientY;
                }
            }
            if (e.cancelable) e.preventDefault();
        };
        this.onTouchEnd = (e) => {
            for (const t of e.changedTouches) {
                if (this.joy && t.identifier === this.joy.id) {
                    this.joy = null;
                    this.input.joyX = 0;
                    this.input.joyY = 0;
                } else if (this.look && t.identifier === this.look.id) this.look = null;
            }
        };
        this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: true });
        window.addEventListener('touchmove', this.onTouchMove, { passive: false });
        window.addEventListener('touchend', this.onTouchEnd);
        window.addEventListener('touchcancel', this.onTouchEnd);
    }

    // Called by the on-screen touch buttons.
    press(action, down = true) {
        if (action === 'fire') {
            if (down && !this.input.fire) this.input.firePressed = true;
            this.input.fire = down;
        } else if (action === 'aim') this.input.aim = down ? !this.input.aim : this.input.aim;
        else if (down) this.input.btn.add(action);
    }

    selectPlayerSlot(i) {
        this.selectSlot(this.player, i);
    }

    requestLock() {
        this.sfx.resume();
        if (this.touch) {
            this.paused = false;
            return;
        }
        this.canvas.requestPointerLock?.();
    }

    pause() {
        this.paused = true;
        if (document.pointerLockElement) document.exitPointerLock?.();
    }

    setSensitivity(v) {
        this.sens = 0.0024 * v;
    }

    setMuted(m) {
        this.sfx.muted = m;
    }

    dispose() {
        cancelAnimationFrame(this.raf);
        this.ended = true;
        this.ro?.disconnect();
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        window.removeEventListener('blur', this.onBlur);
        window.removeEventListener('mouseup', this.onMouseUp);
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('wheel', this.onWheel);
        document.removeEventListener('pointerlockchange', this.onLockChange);
        window.removeEventListener('touchmove', this.onTouchMove);
        window.removeEventListener('touchend', this.onTouchEnd);
        window.removeEventListener('touchcancel', this.onTouchEnd);
        if (document.pointerLockElement) document.exitPointerLock?.();
        this.scene.traverse((o) => {
            if (o.isInstancedMesh) o.dispose();
        });
        this.terrain.geometry.dispose();
        this.renderer.dispose();
        this.renderer.forceContextLoss?.();
        this.canvas.remove();
        this.overlay.remove();
        try {
            this.sfx.ctx?.close();
        } catch {
            // ignore
        }
    }
}

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c1 = new THREE.Color();
const _c2 = new THREE.Color();
const _lists = [];
const _lists2 = [];

// A small turntable renderer for the locker screen.
export function createPreview(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 1.25, 5.4);
    camera.lookAt(0, 0.95, 0);
    scene.add(new THREE.HemisphereLight('#dbeafe', '#1e1b4b', 1.8));
    const key = new THREE.DirectionalLight('#ffffff', 2.4);
    key.position.set(2, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#a78bfa', 1.6);
    rim.position.set(-3, 2, -4);
    scene.add(rim);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.25, 0.18, 32), new THREE.MeshLambertMaterial({ color: '#312e81' }));
    pad.position.y = -0.09;
    scene.add(pad);
    let model = null;
    let raf = 0;
    let t = 0;
    const frame = () => {
        raf = requestAnimationFrame(frame);
        t += 0.016;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (w && h && (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio()))) {
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }
        if (model) {
            model.rotation.y = Math.PI + Math.sin(t * 0.7) * 0.7;
            poseCharacter(model, { walk: 0, moving: false, holding: 'pick', swing: 0 });
            model.userData.body.position.y = Math.sin(t * 2) * 0.02;
        }
        renderer.render(scene, camera);
    };
    frame();
    return {
        setLook(look) {
            if (model) scene.remove(model);
            model = makeCharacter(look);
            setHeld(model, 'pick', makeWeaponMesh('pickaxe'));
            scene.add(model);
        },
        dispose() {
            cancelAnimationFrame(raf);
            renderer.dispose();
            renderer.forceContextLoss?.();
        }
    };
}
