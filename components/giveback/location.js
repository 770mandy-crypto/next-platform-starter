'use client';

import { useCallback, useEffect, useState } from 'react';
import { cityByName } from 'lib/giveback/catalog';
import { nearestCity } from 'lib/giveback/geo';

const KEY = 'giveback:origin';

export function getGpsFix() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('הדפדפן לא תומך במיקום'));
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => reject(new Error(err.code === 1 ? 'לא ניתנה הרשאת מיקום' : 'לא הצלחנו לאתר מיקום')),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    });
}

// Where the searcher is: a GPS fix or a chosen city, remembered per browser so
// the nearest-first order is there on the next visit too.
export function useOrigin() {
    const [origin, setOriginState] = useState(null);
    const [locating, setLocating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(KEY));
            if (saved?.lat) setOriginState(saved);
        } catch {
            // No storage (private mode) — the visitor just picks again.
        }
    }, []);

    const setOrigin = useCallback((next) => {
        setOriginState(next);
        try {
            if (next) localStorage.setItem(KEY, JSON.stringify(next));
            else localStorage.removeItem(KEY);
        } catch {
            // Ignored: remembering the location is a convenience only.
        }
    }, []);

    const locate = useCallback(async () => {
        setLocating(true);
        setError('');
        try {
            const fix = await getGpsFix();
            setOrigin({ ...fix, label: `המיקום שלי (ליד ${nearestCity(fix)?.name ?? ''})`, source: 'gps' });
        } catch (err) {
            setError(err.message);
        } finally {
            setLocating(false);
        }
    }, [setOrigin]);

    const chooseCity = useCallback(
        (name) => {
            const city = cityByName(name);
            setOrigin(city ? { lat: city.lat, lng: city.lng, label: city.name, source: 'city' } : null);
        },
        [setOrigin]
    );

    return { origin, locate, chooseCity, locating, error };
}
