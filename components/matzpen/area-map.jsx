'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

// Leaflet touches window, so it is loaded in the browser only.
export function AreaMap({ areas, selectedId, highlightIds, onSelect }) {
    const container = useRef(null);
    const map = useRef(null);
    const markers = useRef({});
    const leaflet = useRef(null);
    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;

    useEffect(() => {
        let cancelled = false;
        import('leaflet').then((mod) => {
            if (cancelled || map.current) return;
            const L = mod.default ?? mod;
            leaflet.current = L;
            map.current = L.map(container.current, { zoomControl: true }).setView([31.75, 34.95], 8);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 18,
                attribution: '&copy; OpenStreetMap'
            }).addTo(map.current);
            for (const area of areas) {
                const marker = L.circleMarker([area.lat, area.lng], {
                    radius: 7 + area.score / 12,
                    color: '#fff',
                    weight: 2,
                    fillColor: area.trend.color,
                    fillOpacity: 0.85
                })
                    .bindTooltip(`${area.name}, ${area.cityName} · ${area.score}`, { direction: 'top' })
                    .on('click', () => onSelectRef.current(area.id))
                    .addTo(map.current);
                markers.current[area.id] = marker;
            }
        });
        return () => {
            cancelled = true;
            map.current?.remove();
            map.current = null;
            markers.current = {};
        };
    }, [areas]);

    // Selection and agent highlights restyle the markers.
    useEffect(() => {
        const highlighted = new Set(highlightIds);
        for (const [id, marker] of Object.entries(markers.current)) {
            const active = id === selectedId || highlighted.has(id);
            marker.setStyle({ color: active ? '#1e1b4b' : '#fff', weight: active ? 4 : 2 });
            if (active) marker.bringToFront();
        }
        const selected = selectedId && markers.current[selectedId];
        if (selected) map.current?.flyTo(selected.getLatLng(), 13, { duration: 0.8 });
        else if (highlighted.size && leaflet.current && map.current) {
            const points = [...highlighted].map((id) => markers.current[id]?.getLatLng()).filter(Boolean);
            if (points.length) map.current.flyToBounds(leaflet.current.latLngBounds(points).pad(0.4), { duration: 0.8, maxZoom: 12 });
        }
    }, [selectedId, highlightIds]);

    return <div ref={container} className="h-full w-full" aria-label="מפת השכונות" />;
}
