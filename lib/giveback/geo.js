// Distance maths and the deep links into Waze and Google Maps. Pure functions
// with no I/O, so both the server and the browser can use them.

import { CITIES } from './catalog.js';

const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
    return (deg * Math.PI) / 180;
}

export function isCoord(point) {
    return (
        point != null &&
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lng) &&
        Math.abs(point.lat) <= 90 &&
        Math.abs(point.lng) <= 180
    );
}

// Great-circle distance. Accurate to well under 1% at the distances people
// will drive to pick up a chest of drawers.
export function distanceKm(a, b) {
    if (!isCoord(a) || !isCoord(b)) return null;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// The public view of an item never carries the giver's exact location: it is
// snapped to a ~1km grid, so a listing shows the neighbourhood, not the house.
// The exact address is only ever handed over in the chat, by the giver.
export function approximate(point) {
    if (!isCoord(point)) return null;
    return { lat: Math.round(point.lat * 100) / 100, lng: Math.round(point.lng * 100) / 100 };
}

export function nearestCity(point) {
    if (!isCoord(point)) return null;
    let best = null;
    for (const city of CITIES) {
        const d = distanceKm(point, city);
        if (best === null || d < best.d) best = { city, d };
    }
    return best.city;
}

export function formatDistance(km) {
    if (km == null) return '';
    if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} מ׳`;
    if (km < 10) return `${km.toFixed(1)} ק״מ`;
    return `${Math.round(km)} ק״מ`;
}

// Waze's universal link opens the app on phones (or the web live map on a
// desktop) and starts navigation straight away. Exact coordinates are preferred
// because they land on the door; the address text is the fallback.
export function wazeLink({ lat, lng, address } = {}) {
    if (isCoord({ lat, lng })) return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    if (address) return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
    return null;
}

export function googleMapsLink({ lat, lng, address } = {}) {
    const destination = isCoord({ lat, lng }) ? `${lat},${lng}` : address;
    if (!destination) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

// A keyless Google Maps embed. Used only with approximate coordinates.
export function googleEmbedUrl({ lat, lng }, zoom = 14) {
    if (!isCoord({ lat, lng })) return null;
    return `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&hl=iw&output=embed`;
}
