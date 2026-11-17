// The cable car: one loop round the whole city that stops on every roof.
// Stops are the roofs of all buildings, ordered by their angle round the city
// centre, so the cable encircles the map. Pure geometry, no rendering.

export const CABLE_HEIGHT = 84;
export const DWELL = 3;

export function cableStops(world) {
    return world.buildings
        .map((b) => ({
            id: b.index, name: b.name, x: b.cx, z: b.cz,
            roof: b.h + 0.2, // where people stand
            y: b.h + 3.5, // where the cable runs over the station
            angle: Math.atan2(b.cz, b.cx)
        }))
        .sort((p, q) => p.angle - q.angle);
}

export function cableSegments(stops) {
    return stops.map((a, n) => {
        const b = stops[(n + 1) % stops.length];
        const len = Math.hypot(b.x - a.x, b.z - a.z);
        return { a, b, len, dur: Math.min(6, Math.max(1.4, len / 35)) };
    });
}

/** Where the cabin hangs on segment `seg` at fraction t (0 = at the stop). It rises above the city between stops and comes down to every roof. */
export function cablePose(segs, seg, t) {
    const { a, b } = segs[seg];
    const base = a.y + (b.y - a.y) * t;
    const lift = Math.sqrt(Math.sin(Math.PI * t));
    return {
        x: a.x + (b.x - a.x) * t,
        y: base + (CABLE_HEIGHT - base) * lift,
        z: a.z + (b.z - a.z) * t,
        yaw: Math.atan2(b.x - a.x, b.z - a.z)
    };
}

/** Points along the whole loop (x, y, z, x, y, z, ...), for drawing the cable. */
export function cableSamples(segs, per = 8) {
    const out = [];
    for (let s = 0; s < segs.length; s++) {
        for (let k = 0; k < per; k++) {
            const p = cablePose(segs, s, k / per);
            out.push(p.x, p.y, p.z);
        }
    }
    return out;
}
