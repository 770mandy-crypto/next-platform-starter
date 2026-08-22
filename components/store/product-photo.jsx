'use client';

import { useEffect, useRef, useState } from 'react';

/*
The photograph layer.

It sits on top of the vector rendering and fades in once decoded, so there is
never a flash of empty frame and never a broken-image icon: if the file is
missing or fails to load, this layer simply stays transparent and the vector
garment underneath is what the shopper sees.

The effect below is not redundant with onLoad. An image served from cache is
frequently complete before React hydrates and attaches the handler, so onLoad
never fires and the photo would stay invisible forever. Checking `complete` on
mount closes that race.
*/
export function ProductPhoto({ src, alt, priority = false }) {
    const ref = useRef(null);
    const [state, setState] = useState('loading');

    useEffect(() => {
        const image = ref.current;
        if (!image) return;
        if (image.complete) {
            setState(image.naturalWidth > 0 ? 'loaded' : 'failed');
        }
    }, [src]);

    return (
        <img
            ref={ref}
            src={src}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setState('loaded')}
            onError={() => setState('failed')}
            className="absolute inset-0 object-cover w-full h-full"
            style={{
                opacity: state === 'loaded' ? 1 : 0,
                transform: state === 'loaded' ? 'scale(1)' : 'scale(1.1)',
                transition: 'opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
        />
    );
}
