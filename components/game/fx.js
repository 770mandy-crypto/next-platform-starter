import * as THREE from 'three';

// Environment and effects: sky, clouds, water, grass, storm wall, flashes, dust.

export function makeSky(world, sunDir) {
    const top = new THREE.Color(world.sky).multiplyScalar(0.72);
    const horizon = new THREE.Color(world.fog);
    const mat = new THREE.ShaderMaterial({
        uniforms: {
            uTop: { value: top },
            uHorizon: { value: horizon },
            uBottom: { value: horizon.clone().multiplyScalar(0.92) },
            uSun: { value: new THREE.Color(world.sun) },
            uSunDir: { value: sunDir.clone().normalize() }
        },
        vertexShader: `
            varying vec3 vDir;
            void main() {
                vDir = normalize(position);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,
        fragmentShader: `
            uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uBottom; uniform vec3 uSun; uniform vec3 uSunDir;
            varying vec3 vDir;
            void main() {
                vec3 d = normalize(vDir);
                float h = d.y;
                vec3 c = h > 0.0 ? mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(uHorizon, uBottom, pow(clamp(-h, 0.0, 1.0), 0.5));
                float s = max(dot(d, uSunDir), 0.0);
                c += uSun * (pow(s, 900.0) * 4.0 + pow(s, 40.0) * 0.35 + pow(s, 6.0) * 0.12);
                gl_FragColor = vec4(c, 1.0);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }`,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1100, 32, 16), mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = -10;
    return mesh;
}

export function makeClouds(world, rand = Math.random) {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const mat = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: new THREE.Color(world.sky), emissiveIntensity: 0.35, flatShading: true });
    const n = 34 * 6;
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let i = 0;
    for (let c = 0; c < 34; c++) {
        const cx = (rand() - 0.5) * 900;
        const cz = (rand() - 0.5) * 900;
        const cy = 175 + rand() * 60;
        const size = 10 + rand() * 14;
        for (let k = 0; k < 6; k++) {
            const s = size * (0.55 + rand() * 0.6);
            m.compose(new THREE.Vector3(cx + (rand() - 0.5) * size * 2.6, cy + rand() * size * 0.4, cz + (rand() - 0.5) * size * 1.4), q, new THREE.Vector3(s * 1.3, s * 0.7, s));
            mesh.setMatrixAt(i++, m);
        }
    }
    mesh.frustumCulled = false;
    return mesh;
}

function noiseNormalMap(size = 256) {
    const h = new Float32Array(size * size);
    const waves = [];
    for (let i = 0; i < 18; i++) waves.push([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1, Math.random() * 6.28, 0.3 + Math.random()]);
    for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
            let v = 0;
            for (const [a, b, p, amp] of waves) v += Math.sin(((x * a + y * b) / size) * Math.PI * 2 + p) * amp;
            h[y * size + x] = v;
        }
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
            const dx = h[y * size + ((x + 1) % size)] - h[y * size + ((x - 1 + size) % size)];
            const dy = h[((y + 1) % size) * size + x] - h[((y - 1 + size) % size) * size + x];
            const n = new THREE.Vector3(-dx * 0.18, -dy * 0.18, 1).normalize();
            const i = (y * size + x) * 4;
            img.data[i] = (n.x * 0.5 + 0.5) * 255;
            img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
            img.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
            img.data[i + 3] = 255;
        }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(90, 90);
    return tex;
}

export function makeWater(world) {
    const normalMap = noiseNormalMap();
    const mat = new THREE.MeshStandardMaterial({
        color: world.water,
        roughness: 0.12,
        metalness: 0.15,
        transparent: true,
        opacity: 0.86,
        normalMap,
        normalScale: new THREE.Vector2(0.6, 0.6)
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = world.waterLevel;
    mesh.receiveShadow = true;
    mesh.userData.update = (dt) => {
        normalMap.offset.x += dt * 0.012;
        normalMap.offset.y += dt * 0.008;
    };
    return mesh;
}

// Wind-blown grass tufts that are laid out around the player as they move.
export function makeGrass(color, count) {
    const pos = [];
    const blades = 4;
    for (let b = 0; b < blades; b++) {
        const a = (b / blades) * Math.PI + Math.random() * 0.4;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const w = 0.035;
        const hgt = 0.22 + Math.random() * 0.16;
        const lean = (Math.random() - 0.5) * 0.15;
        const ox = (Math.random() - 0.5) * 0.25;
        const oz = (Math.random() - 0.5) * 0.25;
        pos.push(ox - ca * w, 0, oz - sa * w, ox + ca * w, 0, oz + sa * w, ox + lean, hgt, oz + lean);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const normals = [];
    for (let i = 0; i < pos.length / 3; i++) normals.push(0, 1, 0);
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    const uniforms = { uTime: { value: 0 } };
    const mat = new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = uniforms.uTime;
        sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            vec4 wp0 = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            float sway = sin(uTime * 2.1 + wp0.x * 0.31 + wp0.z * 0.17) + 0.5 * sin(uTime * 3.7 + wp0.z * 0.5);
            transformed.x += sway * position.y * 0.22;
            transformed.z += cos(uTime * 1.6 + wp0.x * 0.23) * position.y * 0.12;`
        );
    };
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.frustumCulled = false;
    mesh.receiveShadow = true;
    const base = new THREE.Color(color);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) mesh.setColorAt(i, c.copy(base).multiplyScalar(0.8 + Math.random() * 0.3));
    mesh.userData.uniforms = uniforms;
    mesh.userData.center = null;
    return mesh;
}

export function layoutGrass(mesh, cx, cz, radius, spacing, heightAt, allowed) {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    let i = 0;
    const gx0 = Math.floor((cx - radius) / spacing);
    const gx1 = Math.floor((cx + radius) / spacing);
    const gz0 = Math.floor((cz - radius) / spacing);
    const gz1 = Math.floor((cz + radius) / spacing);
    for (let gx = gx0; gx <= gx1 && i < mesh.count; gx++)
        for (let gz = gz0; gz <= gz1 && i < mesh.count; gz++) {
            const h1 = Math.sin(gx * 127.1 + gz * 311.7) * 43758.5453;
            const h2 = Math.sin(gx * 269.5 + gz * 183.3) * 43758.5453;
            const r1 = h1 - Math.floor(h1);
            const r2 = h2 - Math.floor(h2);
            const x = (gx + r1) * spacing;
            const z = (gz + r2) * spacing;
            const d = Math.hypot(x - cx, z - cz);
            if (d > radius || !allowed(x, z, r1)) continue;
            const edge = Math.min(1, (radius - d) / 10);
            p.set(x, heightAt(x, z) - 0.03, z);
            q.setFromAxisAngle(UP, r1 * 6.28);
            const sc = (0.75 + r2 * 0.5) * edge;
            s.set(sc, sc * (0.75 + r1 * 0.5), sc);
            m.compose(p, q, s);
            mesh.setMatrixAt(i++, m);
        }
    for (let j = i; j < mesh.count; j++) mesh.setMatrixAt(j, zero);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.center = { x: cx, z: cz };
}
const UP = new THREE.Vector3(0, 1, 0);

export function makeStormMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uFlash: { value: 0 } },
        vertexShader: `
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
            uniform float uTime; uniform float uFlash;
            varying vec2 vUv;
            void main() {
                float x = vUv.x * 6.2831;
                float n1 = sin(x * 24.0 + uTime * 1.3 + sin(vUv.y * 9.0 + uTime * 0.7) * 2.5) * 0.5 + 0.5;
                float n2 = sin(x * 9.0 - uTime * 0.6 + vUv.y * 30.0) * 0.5 + 0.5;
                float n3 = sin(x * 55.0 + vUv.y * 80.0 - uTime * 2.0) * 0.5 + 0.5;
                vec3 c = mix(vec3(0.32, 0.06, 0.6), vec3(0.75, 0.35, 1.0), n1 * n2);
                c += vec3(0.5, 0.3, 0.8) * pow(n3, 8.0) * 0.6 + vec3(0.9, 0.8, 1.0) * uFlash;
                float a = 0.28 + 0.3 * n1 * n2 + uFlash * 0.3;
                a *= smoothstep(0.0, 0.04, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
                gl_FragColor = vec4(c, a);
                #include <colorspace_fragment>
            }`,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });
}

function radialTexture(inner, outer) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, inner);
    g.addColorStop(0.35, outer);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
}

// Pools of billboards for muzzle flashes and soft dust/smoke puffs.
export class Sprites {
    constructor(scene) {
        this.scene = scene;
        this.flashTex = radialTexture('rgba(255,255,230,1)', 'rgba(255,190,60,0.85)');
        this.puffTex = radialTexture('rgba(255,255,255,0.85)', 'rgba(255,255,255,0.35)');
        this.items = [];
    }

    spawn(kind, pos, opts = {}) {
        let it = this.items.find((x) => !x.alive && x.kind === kind);
        if (!it) {
            if (this.items.length > 160) return;
            const mat = new THREE.SpriteMaterial({
                map: kind === 'flash' ? this.flashTex : this.puffTex,
                transparent: true,
                depthWrite: false,
                blending: kind === 'flash' ? THREE.AdditiveBlending : THREE.NormalBlending
            });
            it = { kind, sprite: new THREE.Sprite(mat) };
            this.scene.add(it.sprite);
            this.items.push(it);
        }
        it.alive = true;
        it.t = 0;
        it.life = opts.life ?? (kind === 'flash' ? 0.06 : 0.9);
        it.size0 = opts.size ?? (kind === 'flash' ? 0.7 : 0.6);
        it.size1 = opts.grow ?? (kind === 'flash' ? 0.9 : 2.2);
        it.vel = opts.vel ? opts.vel.clone() : new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.5 + Math.random() * 0.4, (Math.random() - 0.5) * 0.6);
        it.alpha = opts.alpha ?? (kind === 'flash' ? 1 : 0.55);
        it.sprite.material.color.set(opts.color || '#ffffff');
        it.sprite.material.rotation = Math.random() * 6.28;
        it.sprite.position.copy(pos);
        it.sprite.visible = true;
        it.sprite.scale.setScalar(it.size0);
    }

    update(dt) {
        for (const it of this.items) {
            if (!it.alive) continue;
            it.t += dt;
            const k = it.t / it.life;
            if (k >= 1) {
                it.alive = false;
                it.sprite.visible = false;
                continue;
            }
            it.sprite.position.addScaledVector(it.vel, dt);
            it.vel.multiplyScalar(1 - dt * 1.5);
            it.sprite.scale.setScalar(it.size0 + (it.size1 - it.size0) * Math.sqrt(k));
            it.sprite.material.opacity = it.alpha * (1 - k);
        }
    }
}
