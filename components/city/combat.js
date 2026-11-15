// Weapons and hit detection. Pure maths over the world data, so bots, the
// player and the tests all resolve shots the same way.

export const WEAPONS = {
    pistol: { id: 'pistol', name: 'אקדח', dmg: 22, rate: 3.5, mag: 12, spread: 0.012, pellets: 1, range: 90, auto: false, reload: 1.1, color: '#8d949a', len: 0.3 },
    smg: { id: 'smg', name: 'תת־מקלע', dmg: 13, rate: 11, mag: 30, spread: 0.03, pellets: 1, range: 70, auto: true, reload: 1.6, color: '#4c5a66', len: 0.5 },
    shotgun: { id: 'shotgun', name: 'רובה ציד', dmg: 11, rate: 1.3, mag: 6, spread: 0.075, pellets: 8, range: 35, auto: false, reload: 2.2, color: '#7a5a3c', len: 0.8 },
    rifle: { id: 'rifle', name: 'רובה סער', dmg: 24, rate: 8, mag: 30, spread: 0.016, pellets: 1, range: 140, auto: true, reload: 1.9, color: '#3d4a3f', len: 0.85 },
    sniper: { id: 'sniper', name: 'רובה צלפים', dmg: 95, rate: 0.9, mag: 5, spread: 0.002, pellets: 1, range: 320, auto: false, reload: 2.6, color: '#2f3338', len: 1.15 }
};
export const WEAPON_ORDER = ['pistol', 'smg', 'shotgun', 'rifle', 'sniper'];
export const CRATE_COLORS = { pistol: '#9aa3a8', smg: '#4f8fb0', shotgun: '#c98a45', rifle: '#5d9a62', sniper: '#a56bc4', med: '#e8e4dc' };

/** Distance along a ray to the first wall, slab or the ground; max if nothing is hit. */
export function rayWorld(world, ox, oy, oz, dx, dy, dz, max) {
    let best = max;
    if (dy < -1e-6) {
        const t = -oy / dy;
        if (t > 0 && t < best) best = t;
    }
    const ix = 1 / (dx || 1e-9), iy = 1 / (dy || 1e-9), iz = 1 / (dz || 1e-9);
    const boxes = world.rayBoxes;
    for (let n = 0; n < boxes.length; n++) {
        const b = boxes[n];
        let t0 = (b[0] - ox) * ix, t1 = (b[3] - ox) * ix;
        let tmin = t0 < t1 ? t0 : t1, tmax = t0 < t1 ? t1 : t0;
        if (tmax < 0 || tmin > best) continue;
        t0 = (b[1] - oy) * iy; t1 = (b[4] - oy) * iy;
        if (t0 > t1) { const s = t0; t0 = t1; t1 = s; }
        if (t0 > tmin) tmin = t0;
        if (t1 < tmax) tmax = t1;
        if (tmax < tmin) continue;
        t0 = (b[2] - oz) * iz; t1 = (b[5] - oz) * iz;
        if (t0 > t1) { const s = t0; t0 = t1; t1 = s; }
        if (t0 > tmin) tmin = t0;
        if (t1 < tmax) tmax = t1;
        if (tmax < tmin || tmax < 0) continue;
        if (tmin < 0) tmin = 0;
        if (tmin < best) best = tmin;
    }
    return best;
}

/** True when nothing solid lies between two points. */
export function lineClear(world, ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const d = Math.hypot(dx, dy, dz);
    if (d < 0.01) return true;
    return rayWorld(world, ax, ay, az, dx / d, dy / d, dz / d, d) >= d - 0.05;
}

const BODY = [[0.45, 0.42, 1], [0.98, 0.42, 1], [1.56, 0.26, 1.7]]; // height, radius, damage factor

/** Where a ray meets a standing actor ({x, y, z}), as { t, factor }, or null. */
export function rayActor(ox, oy, oz, dx, dy, dz, a) {
    let hit = null;
    for (const [h, rad, factor] of BODY) {
        const cx = a.x - ox, cy = a.y + h - oy, cz = a.z - oz;
        const tc = cx * dx + cy * dy + cz * dz;
        if (tc < 0) continue;
        const d2 = cx * cx + cy * cy + cz * cz - tc * tc;
        if (d2 > rad * rad) continue;
        const t = tc - Math.sqrt(rad * rad - d2);
        if (!hit || t < hit.t) hit = { t: Math.max(0, t), factor };
    }
    return hit;
}

/**
 * Fire one trigger pull. Returns a pellet list:
 * { end: [x, y, z], target: actor | null, damage }.
 * `spread` overrides the weapon's own spread (bots add their aim error to it).
 */
export function shoot(world, origin, dir, weapon, targets, rand, spread = weapon.spread) {
    const pellets = [];
    for (let p = 0; p < weapon.pellets; p++) {
        let dx = dir[0] + (rand() - 0.5) * 2 * spread;
        let dy = dir[1] + (rand() - 0.5) * 2 * spread;
        let dz = dir[2] + (rand() - 0.5) * 2 * spread;
        const len = Math.hypot(dx, dy, dz) || 1;
        dx /= len; dy /= len; dz /= len;
        let t = rayWorld(world, origin[0], origin[1], origin[2], dx, dy, dz, weapon.range);
        let target = null, factor = 1;
        for (const a of targets) {
            if (a.dead) continue;
            const h = rayActor(origin[0], origin[1], origin[2], dx, dy, dz, a);
            if (h && h.t < t) { t = h.t; target = a; factor = h.factor; }
        }
        pellets.push({ end: [origin[0] + dx * t, origin[1] + dy * t, origin[2] + dz * t], target, damage: Math.round(weapon.dmg * factor) });
    }
    return pellets;
}
