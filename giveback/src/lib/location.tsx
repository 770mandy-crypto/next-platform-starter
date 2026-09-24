import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { CITIES } from './catalog';
import { isInIsrael, nearestCity, type Point } from './geo';

export type Origin = Point & { label: string; source: 'gps' | 'city' };

type LocationState = {
  origin: Origin | null;
  /** True once the saved location (if any) has been read from this device. */
  ready: boolean;
  locating: boolean;
  error: string | null;
  locate: () => Promise<Origin | null>;
  chooseCity: (name: string) => void;
};

const KEY = 'giveback:origin';
const LocationContext = createContext<LocationState | null>(null);

export function useOrigin() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useOrigin outside LocationProvider');
  return ctx;
}

/** A single GPS fix, or a readable Hebrew error. */
export async function getGpsFix(): Promise<Point> {
  // expo-location's web version always answers with the first position it
  // ever got (maximumAge: Infinity), so someone who moved would keep seeing
  // the old place. Ask the browser directly for a fix at most a minute old.
  if (Platform.OS === 'web') return browserFix();
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('לא ניתנה הרשאת מיקום — אפשר לבחור עיר במקום');
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

// The person just pressed "my location", so ask for a fresh position; if the
// device cannot get one in time, fall back to the last one it knows.
function browserFix(): Promise<Point> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.reject(new Error('הדפדפן לא תומך במיקום — אפשר לבחור עיר במקום'));
  }
  const ask = (maximumAge: number, timeout: number) =>
    new Promise<Point>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        reject,
        { enableHighAccuracy: true, maximumAge, timeout },
      ),
    );
  return ask(0, 15_000)
    .catch((err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) throw err;
      return ask(Infinity, 5_000);
    })
    .catch((err: GeolocationPositionError) => {
      throw new Error(
        err.code === err.PERMISSION_DENIED
          ? 'לא ניתנה הרשאת מיקום — אפשר לבחור עיר במקום'
          : 'לא הצלחנו לאתר את המיקום — אפשר לבחור עיר במקום',
      );
    });
}

/** Street-level place names for a point (phones only; the web has no geocoder). */
export async function describePlace(point: Point) {
  if (Platform.OS === 'web') return null;
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude: point.lat, longitude: point.lng });
    return place ? { neighborhood: place.district ?? place.subregion ?? null, street: place.street ?? null } : null;
  } catch {
    return null;
  }
}

/** On-device geocoding of a typed address; null when unavailable or far off. */
export async function geocode(address: string, near?: Point): Promise<Point | null> {
  if (Platform.OS === 'web' || !address.trim()) return null;
  try {
    const [hit] = await Location.geocodeAsync(address);
    if (!hit) return null;
    const p = { lat: hit.latitude, lng: hit.longitude };
    if (!isInIsrael(p)) return null;
    // Reject matches in another town with the same street name.
    if (near && (Math.abs(p.lat - near.lat) > 0.1 || Math.abs(p.lng - near.lng) > 0.1)) return null;
    return p;
  } catch {
    return null;
  }
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setOrigin(JSON.parse(raw)))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const save = useCallback((next: Origin) => {
    setOrigin(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const locate = useCallback(async () => {
    setLocating(true);
    setError(null);
    try {
      const fix = await getGpsFix();
      if (!isInIsrael(fix)) throw new Error('נראה שאת/ה מחוץ לישראל — בחרו עיר');
      const next: Origin = { ...fix, label: `ליד ${nearestCity(fix).name}`, source: 'gps' };
      save(next);
      return next;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setLocating(false);
    }
  }, [save]);

  const chooseCity = useCallback(
    (name: string) => {
      const city = CITIES.find((c) => c.name === name);
      if (city) save({ lat: city.lat, lng: city.lng, label: city.name, source: 'city' });
    },
    [save],
  );

  const value = useMemo(
    () => ({ origin, ready, locating, error, locate, chooseCity }),
    [origin, ready, locating, error, locate, chooseCity],
  );
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}
