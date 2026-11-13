'use client';

import { useCallback, useEffect, useState } from 'react';

// One slide at a time, full screen. Arrow keys, space, click or swipe-free
// buttons move between slides; N shows the presenter notes.
export function DeckView({ rtl, title, subtitle, slides }) {
    const total = slides.length + 1;
    const [index, setIndex] = useState(0);
    const [showNotes, setShowNotes] = useState(false);
    const go = useCallback((step) => setIndex((current) => Math.min(total - 1, Math.max(0, current + step))), [total]);

    useEffect(() => {
        const onKey = (event) => {
            const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
            const back = rtl ? 'ArrowRight' : 'ArrowLeft';
            if ([forward, ' ', 'PageDown', 'ArrowDown'].includes(event.key)) go(1);
            else if ([back, 'PageUp', 'ArrowUp'].includes(event.key)) go(-1);
            else if (event.key.toLowerCase() === 'n') setShowNotes((value) => !value);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [go, rtl]);

    const slide = index === 0 ? null : slides[index - 1];
    return (
        <div dir={rtl ? 'rtl' : 'ltr'} className="flex flex-col h-[100dvh] font-hebrew bg-slate-950 text-slate-100">
            <main className="grid flex-1 min-h-0 px-6 py-8 overflow-y-auto sm:px-16 place-items-center">
                {slide ? (
                    <div className="w-full max-w-4xl">
                        <h2 className="text-3xl font-extrabold sm:text-5xl text-balance">{slide.title}</h2>
                        <ul className="mt-8 space-y-4 text-xl sm:text-2xl text-slate-200">
                            {slide.bullets.map((bullet, bulletIndex) => (
                                <li key={bulletIndex} className="flex gap-3">
                                    <span className="mt-3 rounded-full size-2 shrink-0 bg-emerald-400" />
                                    <span>{bullet}</span>
                                </li>
                            ))}
                        </ul>
                        {showNotes && slide.notes && (
                            <p className="p-4 mt-10 text-base border rounded-xl border-white/10 bg-slate-900 text-slate-400">{slide.notes}</p>
                        )}
                    </div>
                ) : (
                    <div className="max-w-4xl text-center">
                        <h1 className="text-4xl font-extrabold text-transparent sm:text-6xl bg-gradient-to-l from-emerald-400 to-sky-400 bg-clip-text text-balance">
                            {title}
                        </h1>
                        {subtitle && <p className="mt-6 text-xl sm:text-2xl text-slate-400">{subtitle}</p>}
                    </div>
                )}
            </main>
            <footer className="flex items-center gap-3 px-4 py-3 border-t border-white/10 bg-slate-900/60">
                <button type="button" onClick={() => go(-1)} disabled={index === 0} className="px-4 py-2 rounded-lg bg-slate-800 disabled:opacity-30">
                    {rtl ? 'הקודם' : 'Back'}
                </button>
                <button type="button" onClick={() => go(1)} disabled={index === total - 1} className="px-4 py-2 font-bold rounded-lg bg-emerald-600 disabled:opacity-30">
                    {rtl ? 'הבא' : 'Next'}
                </button>
                <button type="button" onClick={() => setShowNotes((value) => !value)} className="px-3 py-2 text-sm rounded-lg text-slate-400 hover:text-white">
                    {rtl ? 'הערות דובר' : 'Notes'}
                </button>
                <span className="text-sm ms-auto text-slate-500 tabular-nums">
                    {index + 1} / {total}
                </span>
            </footer>
        </div>
    );
}
