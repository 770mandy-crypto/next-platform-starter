'use client';

import { useEffect, useState } from 'react';
import { ScoreGauge } from './score-gauge';
import { Sparkline } from './sparkline';

function pct(value, digits = 1) {
    if (!Number.isFinite(value)) return '—';
    return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

function toneClass(value) {
    if (!Number.isFinite(value)) return 'opacity-50';
    return value >= 0 ? 'text-green-400' : 'text-red-400';
}

// Score drives the heat colour, so the grid reads as a map at a glance.
function heatStyle(score) {
    if (!Number.isFinite(score)) return { backgroundColor: 'rgba(255,255,255,0.06)' };
    const clamped = Math.min(100, Math.max(0, score));
    const hue = (clamped / 100) * 130; // 0 = red, 130 = green
    const strength = 0.18 + (Math.abs(clamped - 50) / 50) * 0.3;
    return { backgroundColor: `hsl(${hue} 70% 45% / ${strength})`, borderColor: `hsl(${hue} 70% 55% / 0.5)` };
}

function IndexCard({ entry }) {
    if (!entry.ok) {
        return (
            <div className="p-4 rounded-lg bg-white/5">
                <div className="font-semibold">{entry.label}</div>
                <div className="text-xs opacity-50">לא זמין</div>
            </div>
        );
    }

    const isVix = entry.role === 'volatility';

    return (
        <div className="flex flex-col gap-2 p-4 rounded-lg bg-white/5">
            <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{entry.label}</span>
                {!isVix && Number.isFinite(entry.score) && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 tabular-nums">{entry.score}</span>
                )}
            </div>
            <div className="text-2xl font-bold tabular-nums" dir="ltr">
                {Number.isFinite(entry.price) ? entry.price.toFixed(2) : '—'}
            </div>
            <div className="flex gap-3 text-sm tabular-nums" dir="ltr">
                <span className={toneClass(entry.returns?.oneMonth)}>{pct(entry.returns?.oneMonth)}</span>
                <span className="opacity-40">·</span>
                <span className={toneClass(entry.returns?.oneYear)}>{pct(entry.returns?.oneYear)}</span>
            </div>
            <div className="text-[11px] opacity-50">חודש · שנה</div>
            <Sparkline values={entry.sparkline} height={40} />
            {isVix && (
                <p className="text-xs opacity-60">
                    {entry.price > 28 ? 'פחד גבוה בשוק' : entry.price > 18 ? 'תנודתיות בינונית' : 'שאננות יחסית'}
                </p>
            )}
        </div>
    );
}

function SectorTile({ entry }) {
    if (!entry.ok) {
        return (
            <div className="p-3 border rounded-lg border-white/10 bg-white/5">
                <div className="text-sm font-semibold">{entry.label}</div>
                <div className="text-xs opacity-50">לא זמין</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1 p-3 border rounded-lg" style={heatStyle(entry.score)}>
            <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold">{entry.label}</span>
                <span className="text-xs tabular-nums opacity-70" dir="ltr">
                    {entry.symbol}
                </span>
            </div>
            <div className="text-xl font-bold tabular-nums">{entry.score ?? '—'}</div>
            <div className="flex gap-2 text-xs tabular-nums" dir="ltr">
                <span className={toneClass(entry.returns?.threeMonths)}>{pct(entry.returns?.threeMonths)}</span>
                <span className="opacity-40">·</span>
                <span className={toneClass(entry.returns?.oneYear)}>{pct(entry.returns?.oneYear)}</span>
            </div>
            {/* Spell out "moving average" — a bare "ממוצע 50" reads as a score. */}
            <div className="text-[11px] opacity-60">
                {entry.aboveMa50 ? 'מעל ממוצע נע 50' : 'מתחת לממוצע נע 50'}
            </div>
        </div>
    );
}

export function MarketMap() {
    const [state, setState] = useState({ status: 'loading' });

    async function load(force = false) {
        setState({ status: 'loading' });
        try {
            const response = await fetch(`/api/market${force ? '?force=true' : ''}`);
            const payload = await response.json();
            if (!response.ok) {
                setState({ status: 'error', error: payload.error || 'הבקשה נכשלה.' });
                return;
            }
            setState({ status: 'done', map: payload });
        } catch {
            setState({ status: 'error', error: 'לא הצלחתי להגיע לשרת. בדוק את החיבור ונסה שוב.' });
        }
    }

    useEffect(() => {
        load();
    }, []);

    if (state.status === 'loading') {
        return <div className="p-6 text-center rounded-lg bg-white/5 animate-pulse">🤖 שוקי סורק את המדדים והסקטורים…</div>;
    }

    if (state.status === 'error') {
        return (
            <div className="flex flex-col gap-3 p-6 rounded-lg bg-red-500/15 border border-red-400/40">
                <span>{state.error}</span>
                <button type="button" onClick={() => load(true)} className="self-start px-4 py-2 rounded bg-white/10">
                    נסה שוב
                </button>
            </div>
        );
    }

    const { map } = state;
    const scoredIndices = map.indices.filter((entry) => entry.role !== 'volatility');
    const vix = map.indices.find((entry) => entry.role === 'volatility');

    return (
        <div className="flex flex-col gap-8">
            <section className="flex flex-wrap items-center justify-between gap-6 p-6 rounded-lg bg-white/5">
                <div className="min-w-0">
                    <h2>מצב השוק</h2>
                    {map.breadth && (
                        <p className="mt-2 opacity-80">
                            {map.breadth.aboveMa50} מתוך {map.breadth.total} סקטורים מעל הממוצע הנע של 50 ימים ·{' '}
                            {map.breadth.aboveMa200} מעל ממוצע 200 · ציון סקטורים ממוצע {map.breadth.averageScore}
                        </p>
                    )}
                    <div className="w-full h-2 mt-3 overflow-hidden rounded-full bg-white/10 max-w-md">
                        <div
                            className="h-full transition-all duration-700 bg-primary"
                            style={{ width: `${map.breadth?.participation ?? 0}%` }}
                        />
                    </div>
                    <p className="mt-1 text-xs opacity-50">רוחב השוק: {map.breadth?.participation ?? 0}% השתתפות</p>
                </div>
                <ScoreGauge score={map.verdict?.score} verdict={map.verdict?.verdict} tone={map.verdict?.tone} />
            </section>

            {map.narration && (
                <section className="p-6 border rounded-lg border-primary/40 bg-primary/5">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl" aria-hidden="true">
                            🤖
                        </span>
                        <h3>מה שוקי אומר על השוק</h3>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 opacity-70">
                            {map.narration.source === 'claude' ? 'נוסח על ידי Claude' : 'סיכום אוטומטי'}
                        </span>
                    </div>
                    <p className="leading-relaxed">{map.narration.text}</p>
                </section>
            )}

            <section>
                <h3 className="mb-3">מדדים מרכזיים</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {scoredIndices.map((entry) => (
                        <IndexCard key={entry.symbol} entry={entry} />
                    ))}
                    {vix && <IndexCard entry={vix} />}
                </div>
            </section>

            <section>
                <div className="flex items-baseline justify-between gap-4 mb-3">
                    <h3>מפת סקטורים</h3>
                    <span className="text-xs opacity-50">מדורג מהחזק לחלש</span>
                </div>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                    {map.sectors.map((entry) => (
                        <SectorTile key={entry.symbol} entry={entry} />
                    ))}
                </div>
                <p className="mt-2 text-xs opacity-50">בכל אריח: ציון, תשואת 3 חודשים · תשואת שנה</p>
            </section>

            {map.failures?.length > 0 && (
                <div className="p-4 text-sm rounded-lg bg-yellow-500/15 border border-yellow-400/40">
                    לא הצלחתי לשלוף: {map.failures.map((failure) => failure.symbol).join(', ')}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
                <button type="button" onClick={() => load(true)} className="px-4 py-2 rounded bg-white/10">
                    רענן נתונים
                </button>
                <span className="text-xs opacity-50">
                    עודכן {new Date(map.generatedAt).toLocaleString('he-IL')} · נתונים נשמרים לדקה
                </span>
            </div>

            <p className="text-xs leading-relaxed opacity-50">
                הניתוח מבוסס על נתוני Yahoo Finance ועל מודל ציון אוטומטי, וכולל מדדים ותעודות סל בלבד — ולכן הוא טכני
                במהותו. אין לראות בו ייעוץ השקעות או תחליף לייעוץ אישי.
            </p>
        </div>
    );
}
