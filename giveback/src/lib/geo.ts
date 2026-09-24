// Distance maths and deep links into Waze and Google Maps. Pure functions.

import { CITIES, type City } from './catalog';

export type Point = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function isPoint(p: Partial<Point> | null | undefined): p is Point {
  return (
    p != null &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat as number) <= 90 &&
    Math.abs(p.lng as number) <= 180
  );
}

export function distanceKm(a: Point, b: Point) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function isInIsrael({ lat, lng }: Point) {
  return lat > 29.3 && lat < 33.5 && lng > 34.2 && lng < 35.95;
}

export function nearestCity(point: Point): City {
  let best: City = CITIES[0];
  let bestD = Infinity;
  for (const city of CITIES) {
    const d = distanceKm(point, city);
    if (d < bestD) {
      best = city;
      bestD = d;
    }
  }
  return best;
}

export function formatDistance(km: number | null | undefined) {
  if (km == null) return '';
  if (km < 1) return `${Math.max(100, Math.round((km * 1000) / 100) * 100)} מ׳`;
  if (km < 10) return `${km.toFixed(1)} ק״מ`;
  return `${Math.round(km)} ק״מ`;
}

// Waze's universal link opens the app when installed (and the web live map
// otherwise) and starts navigating immediately. Exact coordinates land on the
// door; the address text is the fallback.
export function wazeLink({ lat, lng, address }: { lat?: number | null; lng?: number | null; address?: string | null }) {
  if (isPoint({ lat: lat ?? undefined, lng: lng ?? undefined })) {
    return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  }
  if (address) return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
  return null;
}

export function googleMapsLink({
  lat,
  lng,
  address,
}: {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
}) {
  const destination = isPoint({ lat: lat ?? undefined, lng: lng ?? undefined }) ? `${lat},${lng}` : address;
  if (!destination) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
