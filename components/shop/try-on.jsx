'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useShop } from './providers';
import { useDialog } from '../../lib/shop/use-dialog';
import { FrameShape, frameWidthMm } from './frame-shape';
import { IconClose } from './icons';

const VISION_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL_URL =
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// Outer eye corner to outer eye corner on an adult face, in millimetres. The
// frame is scaled against this so a 52mm lens looks like 52mm on screen.
const FACE_EYE_SPAN_MM = 92;
const LEFT_EYE_OUTER = 33;
const RIGHT_EYE_OUTER = 263;
const NOSE_BRIDGE = 168;

export function TryOn({ product, variant, onClose }) {
    const { t, lang } = useShop();
    const videoRef = useRef(null);
    const rafRef = useRef(0);
    const landmarkerRef = useRef(null);
    const streamRef = useRef(null);

    const [status, setStatus] = useState('loading');
    const [placement, setPlacement] = useState(null);
    const panelRef = useDialog(true, onClose);

    const stop = useCallback(() => {
        cancelAnimationFrame(rafRef.current);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        landmarkerRef.current?.close?.();
        landmarkerRef.current = null;
    }, []);

    useEffect(() => stop, [stop]);

    useEffect(() => {
        let cancelled = false;

        async function start() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
                    audio: false
                });
                if (cancelled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }
                streamRef.current = stream;
                const video = videoRef.current;
                video.srcObject = stream;
                await video.play();

                const vision = await import(/* webpackIgnore: true */ `${VISION_CDN}/vision_bundle.mjs`);
                const fileset = await vision.FilesetResolver.forVisionTasks(`${VISION_CDN}/wasm`);
                const landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
                    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
                    runningMode: 'VIDEO',
                    numFaces: 1
                });
                if (cancelled) {
                    landmarker.close();
                    return;
                }
                landmarkerRef.current = landmarker;
                setStatus('ready');
                loop();
            } catch (error) {
                if (cancelled) return;
                setStatus(error?.name === 'NotAllowedError' ? 'denied' : 'error');
            }
        }

        function loop() {
            const video = videoRef.current;
            const landmarker = landmarkerRef.current;
            if (!video || !landmarker || video.readyState < 2) {
                rafRef.current = requestAnimationFrame(loop);
                return;
            }

            const result = landmarker.detectForVideo(video, performance.now());
            const face = result?.faceLandmarks?.[0];

            if (face) {
                // The preview is mirrored, so mirror the x axis with it.
                const left = { x: 1 - face[LEFT_EYE_OUTER].x, y: face[LEFT_EYE_OUTER].y };
                const right = { x: 1 - face[RIGHT_EYE_OUTER].x, y: face[RIGHT_EYE_OUTER].y };
                const bridge = { x: 1 - face[NOSE_BRIDGE].x, y: face[NOSE_BRIDGE].y };

                const dx = right.x - left.x;
                const dy = right.y - left.y;
                const spanRatio = Math.hypot(dx * video.videoWidth, dy * video.videoHeight) / video.videoWidth;

                setPlacement({
                    // percentage of the preview box
                    cx: ((left.x + right.x) / 2) * 100,
                    cy: (bridge.y + (left.y + right.y) / 2) / 2 * 100,
                    widthPct: (spanRatio * frameWidthMm(product.frame)) / FACE_EYE_SPAN_MM * 100,
                    angle: (Math.atan2(dy * video.videoHeight, dx * video.videoWidth) * 180) / Math.PI
                });
            } else {
                setPlacement(null);
            }

            rafRef.current = requestAnimationFrame(loop);
        }

        start();
        return () => {
            cancelled = true;
            stop();
        };
    }, [product.specs, stop]);

    const copy = t.tryOn;

    return (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4">
            <button
                type="button"
                aria-label={copy.close}
                onClick={onClose}
                className="absolute inset-0 w-full h-full bg-ink/70 backdrop-blur-sm"
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={copy.title}
                tabIndex={-1}
                className="relative w-full max-w-2xl overflow-hidden shadow-2xl outline-none rounded-3xl bg-paper animate-in-up"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b hairline">
                    <div>
                        <p className="eyebrow">{copy.title}</p>
                        <p className="mt-1 text-sm text-inksoft">
                            {product.name[lang]} · {variant.color[lang]}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} aria-label={copy.close}>
                        <IconClose className="w-6 h-6 transition-transform duration-300 hover:rotate-90" />
                    </button>
                </div>

                <div className="relative bg-ink aspect-[4/3]">
                    <video
                        ref={videoRef}
                        playsInline
                        muted
                        className="absolute inset-0 object-cover w-full h-full -scale-x-100"
                    />

                    {placement && (
                        <FrameShape
                            product={product}
                            variant={variant}
                            className="absolute pointer-events-none"
                            style={{
                                left: `${placement.cx}%`,
                                top: `${placement.cy}%`,
                                width: `${placement.widthPct}%`,
                                transform: `translate(-50%, -50%) rotate(${placement.angle}deg)`,
                                overflow: 'visible'
                            }}
                        />
                    )}

                    {status !== 'ready' && (
                        <div className="absolute inset-0 grid p-8 text-center place-items-center text-bone">
                            <p className="max-w-sm text-sm leading-relaxed">
                                {status === 'loading' && copy.loading}
                                {status === 'denied' && copy.denied}
                                {status === 'error' && copy.error}
                            </p>
                        </div>
                    )}

                    {status === 'ready' && !placement && (
                        <p className="absolute inset-x-0 text-xs text-center bottom-4 text-bone/80">{copy.searching}</p>
                    )}
                </div>

                <p className="px-6 py-4 text-xs leading-relaxed text-inksoft">{copy.note}</p>
            </div>
        </div>
    );
}
