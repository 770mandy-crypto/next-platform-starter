'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import { GoogleAreaMap } from './google-map';

// OpenStreetMap (Leaflet) is the fallback when no Google Maps key is set or
// Google Maps fails to load.
const LeafletMap = dynamic(() => import('./area-map').then((m) => m.AreaMap), {
    ssr: false,
    loading: () => <div className="flex h-full items-center justify-center text-slate-400">טוען מפה...</div>
});

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export function MapView(props) {
    const [googleFailed, setGoogleFailed] = useState(false);
    const onError = useCallback((error) => {
        console.error(error);
        setGoogleFailed(true);
    }, []);
    if (GOOGLE_KEY && !googleFailed) return <GoogleAreaMap apiKey={GOOGLE_KEY} onError={onError} {...props} />;
    return <LeafletMap {...props} />;
}
