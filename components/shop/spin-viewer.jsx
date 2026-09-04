'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IconRotate } from './icons';

const AUTO_SPEED = 0.16; // degrees per millisecond-ish frame unit
const FRICTION = 0.94;
const IDLE_BEFORE_AUTOSPIN = 2600;

function normalise(angle) {
    return ((angle % 360) + 360) % 360;
}

/**
 * A turntable that reads as a real 360° product spin from a single studio shot.
 * The photograph is treated as a plane on a rotating stage: perspective handles
 * the foreshortening, the plane flips to its mirrored self past the edge-on
 * point so the far side of the frame faces the viewer, and the contact shadow
 * tracks the rotation so the object stays planted on the ground.
 */
export function SpinViewer({ src, alt, label, className = '' }) {
    const stageRef = useRef(null);
    const angleRef = useRef(18);
    const velocityRef = useRef(0);
    const draggingRef = useRef(false);
    const lastXRef = useRef(0);
    const lastMoveRef = useRef(0);
    const autoRef = useRef(true);
    const rafRef = useRef(0);
    const visibleRef = useRef(true);

    const [angle, setAngle] = useState(18);
    const [dragging, setDragging] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);

    const tick = useCallback(() => {
        const now = performance.now();
        if (!draggingRef.current) {
            if (Math.abs(velocityRef.current) > 0.02) {
                angleRef.current += velocityRef.current;
                velocityRef.current *= FRICTION;
            } else {
                velocityRef.current = 0;
                const idleFor = now - lastMoveRef.current;
                if (autoRef.current && visibleRef.current && idleFor > IDLE_BEFORE_AUTOSPIN) {
                    angleRef.current += AUTO_SPEED;
                }
            }
        }
        const next = normalise(angleRef.current);
        angleRef.current = next;
        setAngle(next);
        rafRef.current = requestAnimationFrame(tick);
    }, []);

    useEffect(() => {
        lastMoveRef.current = performance.now();
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [tick]);

    useEffect(() => {
        const node = stageRef.current;
        if (!node || typeof IntersectionObserver === 'undefined') return undefined;
        const observer = new IntersectionObserver(
            ([entry]) => {
                visibleRef.current = entry.isIntersecting;
            },
            { threshold: 0.25 }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    const onPointerDown = (event) => {
        draggingRef.current = true;
        setDragging(true);
        setHasInteracted(true);
        lastXRef.current = event.clientX;
        velocityRef.current = 0;
        lastMoveRef.current = performance.now();
        event.currentTarget.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event) => {
        if (!draggingRef.current) return;
        const delta = event.clientX - lastXRef.current;
        lastXRef.current = event.clientX;
        const step = delta * 0.55;
        angleRef.current += step;
        velocityRef.current = step;
        lastMoveRef.current = performance.now();
    };

    const endDrag = (event) => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        setDragging(false);
        lastMoveRef.current = performance.now();
        event?.currentTarget?.releasePointerCapture?.(event.pointerId);
    };

    const onKeyDown = (event) => {
        if (event.key === 'ArrowRight') {
            angleRef.current += 12;
            setHasInteracted(true);
            lastMoveRef.current = performance.now();
        }
        if (event.key === 'ArrowLeft') {
            angleRef.current -= 12;
            setHasInteracted(true);
            lastMoveRef.current = performance.now();
        }
    };

    const radians = (angle * Math.PI) / 180;
    const cos = Math.cos(radians);
    const facingAway = cos < 0;
    // Past the edge-on point the mirrored photo stands in for the far side.
    const planeAngle = facingAway ? angle - 180 : angle;
    const depth = Math.abs(cos); // 1 face-on, 0 edge-on
    const shadowScale = 0.42 + depth * 0.58;
    const lift = (1 - depth) * 10;

    return (
        <div className={`relative select-none ${className}`}>
            <div
                ref={stageRef}
                role="img"
                aria-label={alt}
                tabIndex={0}
                onKeyDown={onKeyDown}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onPointerLeave={endDrag}
                className={`spin-stage relative w-full aspect-square ${dragging ? 'is-dragging' : ''}`}
            >
                <div
                    className="spin-object absolute inset-[6%]"
                    style={{
                        transform: `translateY(${-lift}px) rotateY(${planeAngle}deg) scaleX(${facingAway ? -1 : 1})`
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={src}
                        alt=""
                        draggable={false}
                        className="w-full h-full object-contain"
                        style={{
                            mixBlendMode: 'multiply',
                            // Feathers the photograph's own backdrop away so the
                            // rotating plane reads as the frame, not as a card.
                            maskImage: 'radial-gradient(ellipse 62% 58% at 50% 50%, #000 62%, transparent 92%)',
                            WebkitMaskImage:
                                'radial-gradient(ellipse 62% 58% at 50% 50%, #000 62%, transparent 92%)',
                            filter: `brightness(${1 + (1 - depth) * 0.05}) contrast(${1 + (1 - depth) * 0.08})`
                        }}
                    />
                </div>

                {/* contact shadow */}
                <div
                    aria-hidden
                    className="spin-shadow absolute left-1/2 bottom-[11%] h-3 rounded-[50%] bg-ink/25 -translate-x-1/2"
                    style={{
                        width: `${44 * shadowScale}%`,
                        opacity: 0.1 + depth * 0.22
                    }}
                />

                {/* rotation ring */}
                <div
                    aria-hidden
                    className="absolute inset-x-[18%] bottom-[7%] h-6 border rounded-[50%] hairline pointer-events-none"
                    style={{ opacity: 0.5, transform: `scaleX(${0.7 + depth * 0.3})` }}
                />
            </div>

            <div className="flex items-center justify-center gap-3 mt-1 text-[0.7rem] tracking-[0.2em] uppercase text-inksoft">
                <IconRotate
                    className={`w-4 h-4 transition-opacity ${hasInteracted ? 'opacity-40' : 'opacity-100 animate-pulse'}`}
                />
                <span>{label}</span>
                <span className="ticker-digit tabular-nums opacity-50">{Math.round(angle)}°</span>
            </div>
        </div>
    );
}
