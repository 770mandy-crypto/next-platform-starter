'use client';

import { useEffect, useRef } from 'react';

export function Ambient() {
    const canvasRef = useRef(null);
    const modesRef = useRef([]);
    const configRef = useRef({
        w: 0,
        h: 0,
        dpr: 1,
        last: 0,
        running: true,
        motes: []
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        const config = configRef.current;
        const CALM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const SCALE = 4;

        // Quarter-scale buffer for light pools
        const glow = document.createElement('canvas');
        const gctx = glow.getContext('2d');

        const POOLS = [
            { hue: '194, 161, 94', r: 0.52, a: 0.24, ax: 0.20, ay: 0.13, sx: 0.00011, sy: 0.00008, px: 0.0, py: 1.1 },
            { hue: '231, 211, 161', r: 0.36, a: 0.16, ax: 0.24, ay: 0.16, sx: 0.00009, sy: 0.00013, px: 2.1, py: 0.4 },
            { hue: '143, 116, 57', r: 0.62, a: 0.20, ax: 0.16, ay: 0.20, sx: 0.00007, sy: 0.00006, px: 4.2, py: 2.7 }
        ];

        function spawn(anywhere) {
            return {
                x: Math.random() * config.w,
                y: anywhere ? Math.random() * config.h : config.h + 12,
                r: 0.5 + Math.random() * 1.5,
                vy: 0.09 + Math.random() * 0.30,
                drift: (Math.random() - 0.5) * 0.22,
                phase: Math.random() * Math.PI * 2,
                twinkle: 0.7 + Math.random() * 1.6,
                alpha: 0.18 + Math.random() * 0.42
            };
        }

        function resize() {
            config.dpr = Math.min(window.devicePixelRatio || 1, 2);
            config.w = window.innerWidth;
            config.h = window.innerHeight;

            canvas.width = Math.round(config.w * config.dpr);
            canvas.height = Math.round(config.h * config.dpr);
            canvas.style.width = config.w + 'px';
            canvas.style.height = config.h + 'px';
            ctx.setTransform(config.dpr, 0, 0, config.dpr, 0, 0);

            glow.width = Math.max(1, Math.round(config.w / SCALE));
            glow.height = Math.max(1, Math.round(config.h / SCALE));

            const count = Math.min(120, Math.round((config.w * config.h) / 10000));
            config.motes = Array.from({ length: count }, () => spawn(true));
        }

        function paintPools(t) {
            const gw = glow.width;
            const gh = glow.height;
            gctx.clearRect(0, 0, gw, gh);

            POOLS.forEach((p) => {
                const cx = gw * (0.5 + Math.sin(t * p.sx + p.px) * p.ax);
                const cy = gh * (0.5 + Math.cos(t * p.sy + p.py) * p.ay);
                const radius = Math.max(gw, gh) * p.r * (1 + Math.sin(t * 0.00013 + p.px) * 0.12);

                const grad = gctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
                grad.addColorStop(0, `rgba(${p.hue},${p.a})`);
                grad.addColorStop(0.55, `rgba(${p.hue},${(p.a * 0.32).toFixed(4)})`);
                grad.addColorStop(1, `rgba(${p.hue},0)`);
                gctx.fillStyle = grad;
                gctx.fillRect(0, 0, gw, gh);
            });

            ctx.drawImage(glow, 0, 0, config.w, config.h);
        }

        function paintMotes(t, step) {
            ctx.globalCompositeOperation = 'lighter';
            for (const m of config.motes) {
                m.y -= m.vy * step;
                m.x += Math.sin(t * 0.0004 + m.phase) * m.drift * step;
                if (m.y < -12) Object.assign(m, spawn(false));

                const flicker = 0.55 + 0.45 * Math.sin(t * 0.0011 * m.twinkle + m.phase);
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(219, 188, 122,${(m.alpha * flicker).toFixed(3)})`;
                ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
        }

        function frame(t, step) {
            ctx.clearRect(0, 0, config.w, config.h);
            paintPools(t);
            paintMotes(t, step);
        }

        resize();

        let resizeTimer;
        const handleResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(resize, 180);
        };
        window.addEventListener('resize', handleResize);

        if (CALM) {
            frame(0, 0);
            canvas.classList.add('on');
            return () => {
                window.removeEventListener('resize', handleResize);
            };
        }

        config.last = performance.now();
        config.running = true;

        let animationId;
        const loop = (now) => {
            if (config.running) {
                const step = Math.min((now - config.last) / 16.67, 3);
                config.last = now;
                frame(now, step);
            }
            animationId = requestAnimationFrame(loop);
        };

        animationId = requestAnimationFrame(loop);

        const handleVisibilityChange = () => {
            config.running = !document.hidden;
            config.last = performance.now();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        canvas.classList.add('on');

        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            cancelAnimationFrame(animationId);
        };
    }, []);

    return (
        <>
            <canvas id="ambient" ref={canvasRef} aria-hidden="true" />
            <div className="vignette" aria-hidden="true" />
        </>
    );
}
