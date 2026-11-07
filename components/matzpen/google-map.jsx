'use client';

import { useEffect, useRef, useState } from 'react';

let loader = null;

// Loads the Maps JavaScript API once per page.
function loadGoogleMaps(key) {
    if (loader) return loader;
    loader = new Promise((resolve, reject) => {
        window.__matzpenMapsReady = () => resolve(window.google.maps);
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&language=he&region=IL&loading=async&callback=__matzpenMapsReady`;
        script.async = true;
        script.onerror = () => {
            loader = null;
            reject(new Error('Google Maps failed to load'));
        };
        document.head.appendChild(script);
    });
    return loader;
}

export function GoogleAreaMap({ apiKey, areas, selectedId, highlightIds, onSelect, onError }) {
    const container = useRef(null);
    const state = useRef({ map: null, markers: {}, maps: null });
    const [ready, setReady] = useState(false);
    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const maps = await loadGoogleMaps(apiKey);
                const [{ Map }, { Marker }, { SymbolPath }] = await Promise.all([
                    maps.importLibrary('maps'),
                    maps.importLibrary('marker'),
                    maps.importLibrary('core')
                ]);
                if (cancelled) return;
                const map = new Map(container.current, {
                    center: { lat: 31.75, lng: 34.95 },
                    zoom: 8,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                    clickableIcons: false
                });
                const markers = {};
                for (const area of areas) {
                    if (!Number.isFinite(area.lat) || !Number.isFinite(area.lng)) continue;
                    const marker = new Marker({
                        map,
                        position: { lat: area.lat, lng: area.lng },
                        title: `${area.name}, ${area.cityName} · ציון ${area.score}`,
                        icon: {
                            path: SymbolPath.CIRCLE,
                            scale: 7 + area.score / 12,
                            fillColor: area.trend.color,
                            fillOpacity: 0.85,
                            strokeColor: '#ffffff',
                            strokeWeight: 2
                        }
                    });
                    marker.addListener('click', () => onSelectRef.current(area.id));
                    markers[area.id] = marker;
                }
                state.current = { map, markers, maps };
                setReady(true);
            } catch (error) {
                if (!cancelled) onError?.(error);
            }
        })();
        return () => {
            cancelled = true;
            for (const m of Object.values(state.current.markers)) m.setMap(null);
            state.current = { map: null, markers: {}, maps: null };
        };
    }, [apiKey, areas, onError]);

    useEffect(() => {
        const { map, markers, maps } = state.current;
        if (!ready || !map) return;
        const highlighted = new Set(highlightIds);
        for (const [id, marker] of Object.entries(markers)) {
            const active = id === selectedId || highlighted.has(id);
            marker.setIcon({ ...marker.getIcon(), strokeColor: active ? '#1e1b4b' : '#ffffff', strokeWeight: active ? 4 : 2 });
            marker.setZIndex(active ? 1000 : undefined);
        }
        if (selectedId && markers[selectedId]) {
            map.panTo(markers[selectedId].getPosition());
            map.setZoom(14);
        } else if (highlighted.size) {
            const bounds = new maps.LatLngBounds();
            let any = false;
            for (const id of highlighted) {
                if (markers[id]) {
                    bounds.extend(markers[id].getPosition());
                    any = true;
                }
            }
            if (any) map.fitBounds(bounds, 80);
        }
    }, [ready, selectedId, highlightIds]);

    return <div ref={container} className="h-full w-full" aria-label="מפת השכונות" />;
}
