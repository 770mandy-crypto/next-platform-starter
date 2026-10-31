'use client';

import { useEffect, useRef, useState } from 'react';
import { discountedPrice, formatPrice, offer } from 'lib/offer-config';

// Share of the card that has to be scratched off before it reveals itself.
const REVEAL_AT = 0.5;

function ScratchCard({ onReveal }) {
    const canvasRef = useRef(null);
    const drawing = useRef(false);
    const revealed = useRef(false);
    const [done, setDone] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ratio = window.devicePixelRatio || 1;
        const { width, height } = canvas.getBoundingClientRect();
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        const ctx = canvas.getContext('2d');
        ctx.scale(ratio, ratio);

        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#9ca3af');
        gradient.addColorStop(0.5, '#e5e7eb');
        gradient.addColorStop(1, '#9ca3af');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 22px Heebo, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('גרדו כאן 👆', width / 2, height / 2);
    }, []);

    function scratchAt(event) {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d');
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(event.clientX - rect.left, event.clientY - rect.top, 24, 0, Math.PI * 2);
        ctx.fill();
    }

    function checkProgress() {
        if (revealed.current) return;
        const canvas = canvasRef.current;
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let cleared = 0;
        let sampled = 0;
        // Every 32nd pixel is plenty to estimate how much is gone.
        for (let i = 3; i < pixels.length; i += 4 * 32) {
            sampled++;
            if (pixels[i] === 0) cleared++;
        }
        if (cleared / sampled >= REVEAL_AT) {
            revealed.current = true;
            setDone(true);
            onReveal();
        }
    }

    return (
        <div className="relative w-full max-w-sm mx-auto aspect-[16/10] rounded-2xl overflow-hidden shadow-xl select-none">
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-orange-500 to-rose-500 text-white">
                <div className="text-lg font-semibold">זכיתם ב-</div>
                <div className="text-6xl font-black leading-none my-1">{offer.discountPercent}%</div>
                <div className="text-lg font-semibold">הנחה על התוכנית</div>
            </div>
            <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full touch-none cursor-pointer transition-opacity duration-700 ${
                    done ? 'opacity-0 pointer-events-none' : ''
                }`}
                onPointerDown={(e) => {
                    drawing.current = true;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    scratchAt(e);
                }}
                onPointerMove={(e) => drawing.current && scratchAt(e)}
                onPointerUp={() => {
                    drawing.current = false;
                    checkProgress();
                }}
                onPointerCancel={() => (drawing.current = false)}
            />
        </div>
    );
}

function Countdown({ minutes }) {
    const [left, setLeft] = useState(minutes * 60);
    useEffect(() => {
        const timer = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
        return () => clearInterval(timer);
    }, []);
    const mm = String(Math.floor(left / 60)).padStart(2, '0');
    const ss = String(left % 60).padStart(2, '0');
    return (
        <div className="sticky top-0 z-10 bg-slate-900 text-white text-center py-2 text-sm">
            ההנחה שמורה לכם עוד <span className="font-mono font-bold text-orange-300" dir="ltr">{mm}:{ss}</span>
        </div>
    );
}

export default function OfferPage() {
    const [revealed, setRevealed] = useState(false);
    const [selected, setSelected] = useState(offer.plans.find((p) => p.popular)?.id || offer.plans[0].id);
    const [paying, setPaying] = useState(false);
    const [error, setError] = useState('');

    async function checkout() {
        setPaying(true);
        setError('');
        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: selected })
            });
            const data = await res.json();
            if (!res.ok || !data.url) throw new Error(data.error || 'שגיאה בפתיחת התשלום');
            window.location.href = data.url;
        } catch (err) {
            setError(err.message);
            setPaying(false);
        }
    }

    return (
        <>
            {revealed && <Countdown minutes={offer.countdownMinutes} />}
            <main className="max-w-md mx-auto px-5 py-10">
                <div className="text-center mb-8">
                    <div className="text-sm font-bold tracking-wide text-orange-600 mb-2">{offer.brand}</div>
                    <h1 className="text-3xl font-extrabold leading-tight mb-2">
                        {revealed ? 'מזל טוב! ההנחה שלכם נחשפה 🎉' : 'גרדו את הכרטיס וגלו את ההנחה שלכם'}
                    </h1>
                    <p className="text-slate-600">{offer.tagline}</p>
                </div>

                <ScratchCard onReveal={() => setRevealed(true)} />

                <section
                    className={`mt-10 transition-all duration-700 ${
                        revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
                    }`}
                    aria-hidden={!revealed}
                >
                    <h2 className="text-xl font-bold text-center mb-4">בחרו את התוכנית שלכם</h2>
                    <div className="space-y-3">
                        {offer.plans.map((plan) => {
                            const active = plan.id === selected;
                            return (
                                <button
                                    key={plan.id}
                                    type="button"
                                    onClick={() => setSelected(plan.id)}
                                    className={`relative w-full flex items-center justify-between gap-3 rounded-2xl border-2 bg-white p-4 text-right transition ${
                                        active ? 'border-orange-500 shadow-lg' : 'border-slate-200'
                                    }`}
                                >
                                    {plan.popular && (
                                        <span className="absolute -top-3 right-4 rounded-full bg-orange-500 px-3 py-0.5 text-xs font-bold text-white">
                                            הכי פופולרי
                                        </span>
                                    )}
                                    <div>
                                        <div className="font-bold">{plan.name}</div>
                                        <div className="text-xs text-slate-500">{plan.perDayNote}</div>
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm text-slate-400 line-through">{formatPrice(plan.fullPrice)}</div>
                                        <div className="text-xl font-extrabold text-orange-600">
                                            {formatPrice(discountedPrice(plan))}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={checkout}
                        disabled={paying || !revealed}
                        className="mt-6 w-full rounded-full bg-orange-500 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-orange-600 disabled:opacity-60"
                    >
                        {paying ? 'פותחים תשלום מאובטח…' : 'קבלו את התוכנית שלי'}
                    </button>
                    {error && <p className="mt-3 text-center text-sm text-rose-600">{error}</p>}
                    <p className="mt-4 text-center text-xs text-slate-500">
                        🔒 תשלום מאובטח באמצעות Stripe · כרטיס אשראי, Apple Pay ו-Google Pay
                    </p>
                </section>
            </main>
        </>
    );
}
