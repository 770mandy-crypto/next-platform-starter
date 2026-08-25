'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { useLang } from './language';
import { initAudio, isMuted, setMuted, subscribeMuted } from './sound';

export function LanguageToggle() {
    const { lang, setLang } = useLang();

    return (
        <div className="inline-flex p-1 rounded-full bg-white/10 ring-1 ring-white/15">
            {[
                { value: 'he', label: 'עברית' },
                { value: 'en', label: 'English' }
            ].map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => setLang(option.value)}
                    aria-pressed={lang === option.value}
                    className={[
                        'px-3 py-1 text-sm font-bold transition rounded-full cursor-pointer',
                        lang === option.value ? 'bg-white text-purple-700' : 'text-white/70 hover:text-white'
                    ].join(' ')}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

export function SoundToggle() {
    const { t } = useLang();
    const muted = useSyncExternalStore(
        subscribeMuted,
        () => isMuted(),
        () => false
    );

    return (
        <button
            type="button"
            onClick={() => {
                initAudio();
                setMuted(!muted);
            }}
            aria-pressed={!muted}
            title={muted ? t('הפעל צלילים', 'Unmute') : t('השתק', 'Mute')}
            className="px-3 py-1.5 text-lg leading-none transition rounded-full cursor-pointer bg-white/10 ring-1 ring-white/15 hover:bg-white/20"
        >
            <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
            <span className="sr-only">{muted ? t('הפעל צלילים', 'Unmute') : t('השתק', 'Mute')}</span>
        </button>
    );
}

export function StatChip({ label, value, tone = 'default' }) {
    const tones = {
        default: 'bg-white/10 ring-white/15',
        good: 'bg-emerald-400/20 ring-emerald-300/40',
        warn: 'bg-amber-400/20 ring-amber-300/40',
        bad: 'bg-rose-500/20 ring-rose-300/40'
    };

    return (
        <div className={`px-4 py-2 rounded-2xl ring-1 ${tones[tone] ?? tones.default}`}>
            <div className="text-[0.65rem] font-bold tracking-wider uppercase text-white/60">{label}</div>
            <div className="text-xl font-black tabular-nums">{value}</div>
        </div>
    );
}

/** Header + stat row shared by every game screen. */
export function GamePage({ game, stats = [], children }) {
    const { lang, t } = useLang();
    const copy = game[lang];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-4">
                <Link
                    href="/games"
                    className="px-4 py-2 text-sm font-bold no-underline transition rounded-full bg-white/10 ring-1 ring-white/15 hover:bg-white/20"
                >
                    {t('→ חזרה למשחקים', '← Back to games')}
                </Link>
                <h1 className="text-2xl font-black sm:text-3xl">
                    <span aria-hidden="true" className="me-2">
                        {game.emoji}
                    </span>
                    {copy.title}
                </h1>
                <div className="flex items-center gap-2 ms-auto">
                    <SoundToggle />
                    <LanguageToggle />
                </div>
            </div>

            {!!stats.length && (
                <div className="flex flex-wrap gap-3">
                    {stats.map((stat) => (
                        <StatChip key={stat.label} {...stat} />
                    ))}
                </div>
            )}

            {children}

            <p className="text-sm text-white/60">{copy.controls}</p>
        </div>
    );
}

/** Responsive canvas box that keeps the game's aspect ratio on any screen. */
export function GameStage({ canvasRef, width, height, children }) {
    return (
        <div
            className="relative w-full mx-auto overflow-hidden shadow-2xl rounded-3xl ring-2 ring-white/15 bg-slate-950"
            style={{ maxWidth: `${width}px`, aspectRatio: `${width} / ${height}` }}
        >
            <canvas ref={canvasRef} className="block w-full h-full touch-none select-none" />
            {children}
        </div>
    );
}

/** Full-stage overlay used for the start, pause and game-over screens. */
export function Overlay({ emoji, title, lines = [], actionLabel, onAction, secondaryLabel, onSecondary }) {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-slate-950/80 backdrop-blur-sm">
            {emoji && (
                <div aria-hidden="true" className="text-6xl animate-bounce">
                    {emoji}
                </div>
            )}
            <h2 className="text-3xl font-black">{title}</h2>
            {lines.map((line) => (
                <p key={line} className="max-w-xs text-white/80">
                    {line}
                </p>
            ))}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                <button
                    type="button"
                    onClick={onAction}
                    className="px-8 py-3 text-lg font-black text-purple-900 transition bg-white rounded-full cursor-pointer hover:scale-105 active:scale-95"
                >
                    {actionLabel}
                </button>
                {secondaryLabel && (
                    <button
                        type="button"
                        onClick={onSecondary}
                        className="px-6 py-3 font-bold transition rounded-full cursor-pointer bg-white/10 ring-1 ring-white/20 hover:bg-white/20"
                    >
                        {secondaryLabel}
                    </button>
                )}
            </div>
        </div>
    );
}
