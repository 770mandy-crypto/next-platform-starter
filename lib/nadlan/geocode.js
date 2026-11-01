// Finds a map point for a neighborhood. Uses the Google Geocoding API when
// GOOGLE_MAPS_API_KEY is set on the server, otherwise OpenStreetMap's
// Nominatim (free, at most one request per second). Results are cached by the
// importer, so each neighborhood is looked up once.

const MAX_KM_FROM_CITY = 15;

function distanceKm(a, b) {
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// A point is accepted only near its city, so a name that also exists in
// another town does not put the neighborhood on the wrong side of the country.
export function plausible(point, city) {
    if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return false;
    return distanceKm(point, city) <= MAX_KM_FROM_CITY;
}

async function google(query, key, fetchImpl) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&language=iw&region=il&key=${key}`;
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(6_000) });
    const json = await res.json();
    const loc = json?.status === 'OK' ? json.results?.[0]?.geometry?.location : null;
    return loc ? { lat: loc.lat, lng: loc.lng } : null;
}

let lastNominatim = 0;
async function nominatim(query, fetchImpl) {
    const wait = lastNominatim + 1_100 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastNominatim = Date.now();
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=il&accept-language=he&q=${encodeURIComponent(query)}`;
    const res = await fetchImpl(url, {
        headers: { 'user-agent': 'Matzpen/1.0 (real-estate research map)' },
        signal: AbortSignal.timeout(6_000)
    });
    const [hit] = (await res.json()) ?? [];
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
}

export async function geocodeNeighborhood(name, city, { fetchImpl = fetch, key = process.env.GOOGLE_MAPS_API_KEY } = {}) {
    const query = `${name}, ${city.name}, ישראל`;
    try {
        const point = key ? await google(query, key, fetchImpl) : await nominatim(query, fetchImpl);
        return plausible(point, city) ? point : null;
    } catch {
        return null;
    }
}
