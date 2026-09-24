// Optional: turn a typed street address into exact coordinates with the Google
// Geocoding API. With GOOGLE_MAPS_API_KEY unset this is a no-op and the app
// falls back to GPS or the city centre, and Waze navigates by address text.

export function isGeocodingConfigured() {
    return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

export async function geocodeAddress(address) {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key || !address) return null;
    const url =
        'https://maps.googleapis.com/maps/api/geocode/json' +
        `?address=${encodeURIComponent(address)}&region=il&language=iw&key=${key}`;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return null;
        const body = await res.json();
        const hit = body.results?.[0];
        if (body.status !== 'OK' || !hit) return null;
        // A result that only resolved to a city or a street is no better than
        // what we already have, and would put the pin in the wrong place.
        const precise = hit.geometry.location_type === 'ROOFTOP' || hit.geometry.location_type === 'RANGE_INTERPOLATED';
        if (!precise) return null;
        return { lat: hit.geometry.location.lat, lng: hit.geometry.location.lng };
    } catch {
        return null;
    }
}
