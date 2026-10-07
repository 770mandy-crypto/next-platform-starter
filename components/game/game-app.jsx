'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BUILD_PIECES, CHARACTERS, WORLDS } from './data';
import { Game, createPreview } from './engine';

const STORE = 'storm-royale-progress-v1';
const DEFAULT = {
    done: [],
    unlocked: ['raz'],
    selected: 'raz',
    world: 0,
    stats: { matches: 0, wins: 0, kills: 0 },
    best: {},
    settings: { sens: 1, muted: false }
};

function loadProgress() {
    try {
        const p = JSON.parse(localStorage.getItem(STORE));
        if (p) return { ...DEFAULT, ...p, stats: { ...DEFAULT.stats, ...p.stats }, settings: { ...DEFAULT.settings, ...p.settings } };
    } catch {
        // storage may be blocked
    }
    return DEFAULT;
}

function saveProgress(p) {
    try {
        localStorage.setItem(STORE, JSON.stringify(p));
    } catch {
        // storage may be blocked
    }
}

const charById = (id) => CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
const worldUnlocked = (p, i) => i === 0 || p.done.includes(i - 1);

export default function GameApp() {
    const [screen, setScreen] = useState('lobby');
    const [tab, setTab] = useState('play');
    const [progress, setProgressState] = useState(DEFAULT);
    const progressRef = useRef(DEFAULT);
    const [result, setResult] = useState(null);
    const [touch, setTouch] = useState(false);
    const [matchKey, setMatchKey] = useState(0);

    const setProgress = useCallback((p) => {
        progressRef.current = p;
        setProgressState(p);
        saveProgress(p);
    }, []);

    useEffect(() => {
        const p = loadProgress();
        progressRef.current = p;
        setProgressState(p);
        setTouch(window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);
    }, []);

    const startMatch = (worldIndex) => {
        setProgress({ ...progressRef.current, world: worldIndex });
        setMatchKey((k) => k + 1);
        setScreen('game');
        if (touch) {
            document.documentElement.requestFullscreen?.().catch(() => {});
            window.screen?.orientation?.lock?.('landscape').catch(() => {});
        }
    };

    const onEnd = useCallback(
        (r) => {
            const prev = progressRef.current;
            const p = { ...prev, done: [...prev.done], unlocked: [...prev.unlocked], stats: { ...prev.stats }, best: { ...prev.best } };
            const completed = r.place <= 3;
            p.stats.matches++;
            p.stats.kills += r.kills;
            if (r.won) p.stats.wins++;
            p.best[r.worldIndex] = Math.min(p.best[r.worldIndex] ?? 999, r.place);
            let newChar = null;
            let newWorld = null;
            if (completed && !p.done.includes(r.worldIndex)) {
                p.done.push(r.worldIndex);
                const ch = CHARACTERS.find((c) => c.unlockWorld === r.worldIndex);
                if (ch && !p.unlocked.includes(ch.id)) {
                    p.unlocked.push(ch.id);
                    newChar = ch;
                }
                if (r.worldIndex + 1 < WORLDS.length) {
                    newWorld = WORLDS[r.worldIndex + 1];
                    p.world = r.worldIndex + 1;
                }
            }
            setProgress(p);
            setResult({ ...r, completed, newChar, newWorld });
            setScreen('results');
            if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
        },
        [setProgress]
    );

    const exitToLobby = () => {
        setScreen('lobby');
        if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };

    if (screen === 'game') {
        return (
            <GameView
                key={matchKey}
                worldIndex={progress.world}
                character={charById(progress.selected)}
                touch={touch}
                settings={progress.settings}
                onSettings={(settings) => setProgress({ ...progressRef.current, settings })}
                onEnd={onEnd}
                onExit={exitToLobby}
            />
        );
    }
    if (screen === 'results' && result) {
        return <Results result={result} progress={progress} onLobby={() => setScreen('lobby')} onPlay={startMatch} />;
    }
    return <Lobby tab={tab} setTab={setTab} progress={progress} setProgress={setProgress} onPlay={startMatch} touch={touch} />;
}

// ---------------- lobby ----------------

function Lobby({ tab, setTab, progress, setProgress, onPlay, touch }) {
    const sel = charById(progress.selected);
    const world = WORLDS[progress.world] || WORLDS[0];
    const tabs = [
        ['play', '🎮 שחק'],
        ['locker', '🧍 לוקר'],
        ['worlds', '🗺️ עולמות'],
        ['help', '❓ איך משחקים']
    ];
    return (
        <div className="min-h-screen text-white storm-bg">
            <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8 bg-black/30 backdrop-blur">
                <div className="flex items-center gap-3">
                    <a href="/" className="text-sm text-white/60 hover:text-white">
                        → לאתר
                    </a>
                    <h1 className="text-2xl italic font-black tracking-tight sm:text-3xl" style={{ textShadow: '0 3px 0 #1e1b4b' }}>
                        ⚡ סערת הקרב
                    </h1>
                </div>
                <nav className="flex flex-wrap gap-1">
                    {tabs.map(([id, label]) => (
                        <button
                            key={id}
                            onClick={() => setTab(id)}
                            className={`px-3 py-1.5 rounded-lg font-bold text-sm sm:text-base transition ${tab === id ? 'bg-yellow-400 text-slate-900' : 'bg-white/10 hover:bg-white/20'}`}
                        >
                            {label}
                        </button>
                    ))}
                </nav>
                <div className="flex gap-2 text-sm font-bold">
                    <span className="px-2 py-1 rounded bg-white/10">🏆 {progress.stats.wins}</span>
                    <span className="px-2 py-1 rounded bg-white/10">💀 {progress.stats.kills}</span>
                    <span className="px-2 py-1 rounded bg-white/10">
                        🧍 {progress.unlocked.length}/{CHARACTERS.length}
                    </span>
                </div>
            </header>

            {tab === 'play' && (
                <main className="grid max-w-6xl gap-6 px-4 py-6 mx-auto sm:px-8 lg:grid-cols-[1fr_1.1fr]">
                    <div className="relative flex flex-col items-center rounded-3xl bg-gradient-to-b from-indigo-500/30 to-indigo-950/40 ring-1 ring-white/10">
                        <Preview look={sel.look} className="w-full h-[46vh] min-h-[300px]" emotes />
                        <div className="absolute text-center top-4 inset-x-4">
                            <div className="text-3xl italic font-black">{sel.name}</div>
                            <div className="text-yellow-300 font-bold">{sel.title}</div>
                        </div>
                        <div className="px-4 pb-4 text-sm text-center text-white/80">⭐ יכולת: {sel.perk}</div>
                        <button onClick={() => setTab('locker')} className="mb-4 px-4 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 font-bold">
                            החלף דמות
                        </button>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="p-5 rounded-3xl bg-black/30 ring-1 ring-white/10">
                            <div className="text-sm text-white/60">העולם הנבחר · שלב {progress.world + 1} מתוך {WORLDS.length}</div>
                            <div className="mt-1 text-3xl italic font-black">
                                {world.emoji} {world.name}
                            </div>
                            <div className="text-white/80">{world.subtitle}</div>
                            <div className="flex flex-wrap gap-2 mt-3 text-xs">
                                {world.pois.map((p) => (
                                    <span key={p} className="px-2 py-1 rounded-full bg-white/10">
                                        📍 {p}
                                    </span>
                                ))}
                            </div>
                            <div className="mt-3 text-sm text-white/70">
                                {world.bots + 1} שחקנים על האי · סיים בין 3 האחרונים כדי לעבור שלב
                                {CHARACTERS.find((c) => c.unlockWorld === progress.world) && (
                                    <> · פרס: <b className="text-yellow-300">{CHARACTERS.find((c) => c.unlockWorld === progress.world).name}</b></>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 pb-1 overflow-x-auto">
                            {WORLDS.map((w, i) => {
                                const open = worldUnlocked(progress, i);
                                return (
                                    <button
                                        key={w.id}
                                        disabled={!open}
                                        onClick={() => setProgress({ ...progress, world: i })}
                                        className={`shrink-0 w-24 p-2 rounded-2xl text-center transition ${progress.world === i ? 'bg-yellow-400 text-slate-900' : open ? 'bg-white/10 hover:bg-white/20' : 'bg-black/30 opacity-50'}`}
                                    >
                                        <div className="text-3xl">{open ? w.emoji : '🔒'}</div>
                                        <div className="text-xs font-bold leading-tight">{w.name}</div>
                                        {progress.done.includes(i) && <div className="text-xs">✅</div>}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => onPlay(progress.world)}
                            className="py-5 text-4xl italic font-black transition rounded-3xl bg-yellow-400 text-slate-900 hover:bg-yellow-300 hover:scale-[1.02] shadow-[0_6px_0_#a16207]"
                        >
                            שחק!
                        </button>
                        <p className="text-sm text-center text-white/60">
                            {touch ? 'מומלץ לסובב את הטלפון לרוחב 📱↔️' : 'עכבר + מקלדת · לחץ על המסך כדי לנעול את העכבר'}
                        </p>
                    </div>
                </main>
            )}

            {tab === 'locker' && (
                <main className="grid max-w-6xl gap-6 px-4 py-6 mx-auto sm:px-8 lg:grid-cols-[360px_1fr]">
                    <div className="rounded-3xl bg-gradient-to-b from-indigo-500/30 to-indigo-950/40 ring-1 ring-white/10">
                        <Preview look={sel.look} className="w-full h-[50vh] min-h-[320px]" emotes />
                        <div className="p-4 text-center">
                            <div className="text-2xl italic font-black">{sel.name}</div>
                            <div className="text-yellow-300">{sel.title}</div>
                            <div className="mt-1 text-sm text-white/80">⭐ {sel.perk}</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 content-start">
                        {CHARACTERS.map((c) => {
                            const owned = progress.unlocked.includes(c.id);
                            const active = progress.selected === c.id;
                            return (
                                <button
                                    key={c.id}
                                    disabled={!owned}
                                    onClick={() => setProgress({ ...progress, selected: c.id })}
                                    className={`relative p-3 rounded-2xl text-center transition ring-2 ${active ? 'ring-yellow-400 bg-yellow-400/20' : 'ring-transparent bg-white/10 hover:bg-white/20'} ${owned ? '' : 'opacity-60'}`}
                                >
                                    <div className="flex justify-center h-24 items-end">
                                        <MiniAvatar look={c.look} locked={!owned} />
                                    </div>
                                    <div className="mt-2 font-black">{c.name}</div>
                                    <div className="text-xs text-yellow-300">{c.title}</div>
                                    <div className="mt-1 text-[11px] leading-tight text-white/70">
                                        {owned ? c.perk : `🔒 סיים את "${WORLDS[c.unlockWorld].name}" בטופ 3`}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </main>
            )}

            {tab === 'worlds' && (
                <main className="grid max-w-6xl gap-4 px-4 py-6 mx-auto sm:px-8 sm:grid-cols-2 lg:grid-cols-3">
                    {WORLDS.map((w, i) => {
                        const open = worldUnlocked(progress, i);
                        const reward = CHARACTERS.find((c) => c.unlockWorld === i);
                        return (
                            <div key={w.id} className="p-4 rounded-3xl ring-1 ring-white/10" style={{ background: `linear-gradient(160deg, ${w.sky}55, ${w.ground[1]}55)` }}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="text-xs text-white/70">שלב {i + 1}</div>
                                        <div className="text-2xl italic font-black">
                                            {w.emoji} {w.name}
                                        </div>
                                    </div>
                                    <div className="text-sm font-bold">{progress.done.includes(i) ? '✅ הושלם' : open ? '🟢 פתוח' : '🔒 נעול'}</div>
                                </div>
                                <div className="text-sm text-white/80">{w.subtitle}</div>
                                <div className="flex flex-wrap gap-1 mt-2 text-[11px]">
                                    {w.pois.map((p) => (
                                        <span key={p} className="px-2 py-0.5 rounded-full bg-black/30">
                                            {p}
                                        </span>
                                    ))}
                                </div>
                                <div className="mt-2 text-xs text-white/80">
                                    👥 {w.bots + 1} שחקנים · 🎯 קושי {'★'.repeat(i + 1)}
                                    {progress.best[i] ? ` · שיא: #${progress.best[i]}` : ''}
                                </div>
                                {reward && (
                                    <div className="flex items-center gap-2 mt-2 text-sm">
                                        <span>פרס:</span>
                                        <b className="text-yellow-300">
                                            {reward.name} — {reward.title}
                                        </b>
                                    </div>
                                )}
                                <button
                                    disabled={!open}
                                    onClick={() => onPlay(i)}
                                    className="w-full py-2 mt-3 font-black rounded-xl bg-yellow-400 text-slate-900 disabled:bg-white/20 disabled:text-white/50"
                                >
                                    {open ? 'שחק בעולם הזה' : `השלם את ${WORLDS[i - 1].name}`}
                                </button>
                            </div>
                        );
                    })}
                </main>
            )}

            {tab === 'help' && <Help />}
        </div>
    );
}

function Help() {
    const rows = [
        ['W A S D / חיצים', 'תזוזה'],
        ['עכבר', 'הסתכלות וכיוון'],
        ['קליק שמאלי', 'ירי / כרייה / בנייה'],
        ['קליק ימני', 'כיוון מדויק (בצלפים — כוונת)'],
        ['רווח', 'קפיצה · קפיצה מהספינה'],
        ['Shift', 'ריצה מהירה'],
        ['1 – 6 / גלגלת', 'החלפת פריט (1 = מכוש)'],
        ['F', 'מכוש'],
        ['Q', 'מצב בנייה פתוח/סגור'],
        ['Z / X / C', 'קיר / רצפה / רמפה'],
        ['R', 'טעינה מחדש'],
        ['E', 'פתיחת תיבה / איסוף'],
        ['H', 'ריפוי מהיר'],
        ['M', 'מפה גדולה'],
        ['Esc', 'השהיה']
    ];
    return (
        <main className="grid max-w-5xl gap-6 px-4 py-6 mx-auto sm:px-8 md:grid-cols-2">
            <div className="p-5 rounded-3xl bg-black/30 ring-1 ring-white/10">
                <h2 className="mb-3 text-2xl italic font-black">איך מנצחים</h2>
                <ol className="space-y-2 list-decimal list-inside text-white/90">
                    <li>
                        <b>קפוץ מספינת האוויר</b> מעל המקום שבחרת (רווח). המצנח נפתח לבד.
                    </li>
                    <li>
                        <b>אסוף ציוד:</b> תיבות זהב זוהרות מלאות נשקים. צבע הנשק = נדירות (אפור → ירוק → כחול → סגול → זהב).
                    </li>
                    <li>
                        <b>כרה חומרים</b> עם המכוש מעצים, סלעים וקירות — ו<b>בנה</b> קירות, רצפות ורמפות כדי להתגונן ולטפס.
                    </li>
                    <li>
                        <b>הישאר בתוך המעגל.</b> הסערה הסגולה מתכווצת ופוגעת בכל מי שבחוץ.
                    </li>
                    <li>
                        <b>תהיה האחרון שנשאר!</b> סיום בטופ 3 פותח את העולם הבא ודמות חדשה.
                    </li>
                </ol>
                <h3 className="mt-5 mb-2 text-lg font-black">בטלפון</h3>
                <p className="text-white/80">
                    צד שמאל של המסך — ג׳ויסטיק תזוזה. גרירה בצד ימין — הסתכלות. כפתורים לירי, קפיצה, בנייה, טעינה ואיסוף. מומלץ לשחק לרוחב.
                </p>
            </div>
            <div className="p-5 rounded-3xl bg-black/30 ring-1 ring-white/10">
                <h2 className="mb-3 text-2xl italic font-black">מקשים</h2>
                <table className="w-full text-sm">
                    <tbody>
                        {rows.map(([k, v]) => (
                            <tr key={k} className="border-b border-white/10">
                                <td className="py-1.5 font-mono font-bold text-yellow-300" dir="ltr">
                                    {k}
                                </td>
                                <td className="py-1.5">{v}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-white/50 md:col-span-2">
                סערת הקרב הוא משחק מקורי בז׳אנר ה-Battle Royale, בהשראת משחקים כמו פורטנייט. כל הדמויות, המפות והשמות נוצרו במיוחד למשחק הזה.
            </p>
        </main>
    );
}

function Preview({ look, className, emotes }) {
    const ref = useRef(null);
    const pv = useRef(null);
    useEffect(() => {
        let p = null;
        try {
            p = createPreview(ref.current);
        } catch {
            p = null;
        }
        pv.current = p;
        return () => p?.dispose();
    }, []);
    useEffect(() => {
        pv.current?.setLook(look);
    }, [look]);
    if (!emotes) return <canvas ref={ref} className={className} />;
    return (
        <div className="relative w-full">
            <canvas ref={ref} className={className} />
            <div className="absolute flex gap-1.5 -translate-x-1/2 bottom-2 left-1/2">
                {[
                    ['dance', '💃', 'ריקוד'],
                    ['wave', '👋', 'שלום'],
                    ['cheer', '🙌', 'שמחה']
                ].map(([id, icon, label]) => (
                    <button key={id} onClick={() => pv.current?.playEmote(id)} className="px-2.5 py-1 text-sm font-bold rounded-full bg-black/40 hover:bg-black/60 ring-1 ring-white/20">
                        {icon} {label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function MiniAvatar({ look, locked }) {
    const f = locked ? 'brightness(0.15)' : 'none';
    return (
        <div className="relative flex flex-col items-center" style={{ filter: f }}>
            {look.cape && <div className="absolute w-12 h-16 top-10 rounded-b-md" style={{ background: look.cape }} />}
            <div className="relative z-10 w-9 h-9 rounded-md" style={{ background: look.hat === 'dino' ? '#22c55e' : look.hat === 'ninja' ? '#18181b' : look.skin }}>
                {look.hairStyle !== 'none' && <div className="absolute inset-x-0 top-0 h-2.5 rounded-t-md" style={{ background: look.hair }} />}
                {look.hat === 'hardhat' && <div className="absolute inset-x-[-3px] -top-1.5 h-3 rounded-t-md bg-yellow-400" />}
                {(look.hat === 'crown' || look.hat === 'icecrown') && <div className="absolute inset-x-1 -top-2.5 h-3" style={{ background: look.hat === 'crown' ? '#facc15' : '#a5f3fc', clipPath: 'polygon(0 100%,0 0,25% 60%,50% 0,75% 60%,100% 0,100% 100%)' }} />}
                <div className="absolute flex gap-2 top-4 left-1/2 -translate-x-1/2">
                    <span className="block w-1.5 h-1.5 bg-black rounded-sm" />
                    <span className="block w-1.5 h-1.5 bg-black rounded-sm" />
                </div>
            </div>
            <div className="relative z-10 flex">
                <div className="w-2.5 h-9 rounded-sm" style={{ background: look.sleeve || look.shirt }} />
                <div className="w-11 h-10 rounded-sm" style={{ background: look.shirt }}>
                    <div className="h-1.5 mt-8" style={{ background: look.accent }} />
                </div>
                <div className="w-2.5 h-9 rounded-sm" style={{ background: look.sleeve || look.shirt }} />
            </div>
            <div className="relative z-10 flex gap-1">
                <div className="w-4 h-9 rounded-b-sm" style={{ background: look.pants, borderBottom: `5px solid ${look.shoes}` }} />
                <div className="w-4 h-9 rounded-b-sm" style={{ background: look.pants, borderBottom: `5px solid ${look.shoes}` }} />
            </div>
        </div>
    );
}

// ---------------- in-game ----------------

function GameView({ worldIndex, character, touch, settings, onSettings, onEnd, onExit }) {
    const ref = useRef(null);
    const gameRef = useRef(null);
    const [hud, setHud] = useState(null);
    const [error, setError] = useState(null);
    const endRef = useRef(onEnd);
    useEffect(() => {
        endRef.current = onEnd;
    }, [onEnd]);

    useEffect(() => {
        let g;
        try {
            g = new Game(ref.current, {
                worldIndex,
                character,
                touch,
                onHud: setHud,
                onEnd: (r) => endRef.current(r)
            });
        } catch (e) {
            setError(String(e?.message || e));
            return undefined;
        }
        gameRef.current = g;
        window.__stormGame = g;
        return () => {
            g.dispose();
            gameRef.current = null;
        };
    }, [worldIndex, character, touch]);

    useEffect(() => {
        gameRef.current?.setSensitivity(settings.sens);
        gameRef.current?.setMuted(settings.muted);
    }, [settings]);

    const g = () => gameRef.current;
    const world = WORLDS[worldIndex];

    if (error) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-white bg-slate-900">
                <div className="text-2xl font-black">לא הצלחנו להפעיל את המשחק</div>
                <div className="text-white/70">הדפדפן צריך תמיכה ב-WebGL. ({error})</div>
                <button onClick={onExit} className="px-6 py-2 font-bold rounded-xl bg-yellow-400 text-slate-900">
                    חזרה ללובי
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 overflow-hidden bg-black select-none" style={{ touchAction: 'none' }}>
            <div ref={ref} className="absolute inset-0" />
            {hud && <Hud hud={hud} world={world} touch={touch} game={g} />}
            {hud && !hud.started && !touch && (
                <button onClick={() => g()?.requestLock()} className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white bg-black/55">
                    <div className="text-5xl italic font-black">
                        {world.emoji} {world.name}
                    </div>
                    <div className="text-lg text-white/80">{world.subtitle}</div>
                    <div className="px-8 py-4 mt-4 text-3xl italic font-black rounded-2xl bg-yellow-400 text-slate-900 shadow-[0_6px_0_#a16207]">לחץ כדי להתחיל</div>
                    <div className="mt-4 text-sm text-white/70">WASD תזוזה · עכבר כיוון · קליק ירי · רווח קפיצה · Q בנייה · E איסוף · M מפה</div>
                </button>
            )}
            {hud && hud.started && hud.paused && hud.alive && (
                <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/60">
                    <div className="w-full max-w-sm p-6 text-white rounded-3xl bg-slate-900/95 ring-1 ring-white/15">
                        <div className="mb-4 text-3xl italic font-black text-center">⏸️ הפסקה</div>
                        <button onClick={() => g()?.requestLock()} className="w-full py-3 mb-3 text-xl font-black rounded-xl bg-yellow-400 text-slate-900">
                            המשך לשחק
                        </button>
                        <label className="block mb-3 text-sm">
                            רגישות {touch ? 'מגע' : 'עכבר'}: {settings.sens.toFixed(1)}
                            <input
                                type="range"
                                min="0.3"
                                max="2.5"
                                step="0.1"
                                value={settings.sens}
                                onChange={(e) => onSettings({ ...settings, sens: Number(e.target.value) })}
                                className="w-full accent-yellow-400"
                            />
                        </label>
                        <label className="flex items-center gap-2 mb-4 text-sm">
                            <input type="checkbox" checked={settings.muted} onChange={(e) => onSettings({ ...settings, muted: e.target.checked })} />
                            השתק צלילים
                        </label>
                        <button onClick={onExit} className="w-full py-2 font-bold rounded-xl bg-white/10 hover:bg-white/20">
                            יציאה ללובי (המשחק יאבד)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Bar({ value, color, icon }) {
    return (
        <div className="flex items-center gap-2">
            <span className="w-5 text-center">{icon}</span>
            <div className="relative h-4 overflow-hidden rounded bg-black/50 ring-1 ring-white/20 grow" dir="ltr">
                <div className="absolute inset-y-0 left-0 transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
            </div>
            <span className="w-8 text-sm font-black tabular-nums">{value}</span>
        </div>
    );
}

function Hud({ hud, world, touch, game }) {
    const tap = (action) => ({
        onPointerDown: (e) => {
            e.preventDefault();
            e.stopPropagation();
            game()?.press(action, true);
        },
        onPointerUp: (e) => {
            e.preventDefault();
            game()?.press(action, false);
        },
        onPointerLeave: () => {
            if (action === 'fire') game()?.press('fire', false);
        }
    });

    return (
        <div className="absolute inset-0 text-white pointer-events-none" style={{ textShadow: '0 1px 2px rgba(0,0,0,.9)' }}>
            {/* top right, under the minimap: players, kills, storm */}
            <div className={`absolute right-3.5 ${touch ? 'top-[132px]' : 'top-[198px]'} flex flex-col items-end gap-1 text-sm font-bold`}>
                <div className="flex gap-2">
                    <span className="px-2 py-0.5 rounded bg-black/45">👥 {hud.players}</span>
                    <span className="px-2 py-0.5 rounded bg-black/45">💀 {hud.kills}</span>
                </div>
                <span className={`px-2 py-0.5 rounded ${hud.inStorm ? 'bg-purple-600/80' : 'bg-black/45'}`}>🌀 {hud.stormText}</span>
                <span className="px-2 py-0.5 rounded bg-black/45 text-xs">📍 {hud.location}</span>
            </div>

            {/* kill feed, top left */}
            <div className={`absolute flex flex-col items-start gap-1 text-sm left-3 ${touch ? 'top-[92px] text-xs' : 'top-3'}`} dir="rtl">
                {hud.killfeed.map((k) => (
                    <div key={k.id + k.text} className={`px-2 py-0.5 rounded ${k.mine ? 'bg-yellow-500/70' : 'bg-black/45'}`}>
                        {k.text}
                    </div>
                ))}
            </div>

            {/* center messages */}
            {hud.msg && (
                <div className="absolute inset-x-0 text-center top-[18%]">
                    <div className="text-4xl italic font-black sm:text-6xl" style={{ textShadow: '0 4px 0 #1e1b4b, 0 0 20px rgba(0,0,0,.6)' }}>
                        {hud.msg.text}
                    </div>
                    {hud.msg.sub && <div className="mt-1 text-lg font-bold sm:text-xl">{hud.msg.sub}</div>}
                </div>
            )}
            {hud.elim && (
                <div className="absolute inset-x-0 text-center top-[58%]">
                    <div className="text-2xl font-black text-yellow-300">💀 {hud.elim.text}</div>
                    <div className="text-sm">{hud.elim.sub}</div>
                </div>
            )}
            {hud.toast && <div className="absolute inset-x-0 text-center bottom-[30%] text-base font-bold">{hud.toast}</div>}

            {/* bus */}
            {hud.state === 'bus' && (
                <div className="absolute inset-x-0 text-center bottom-[20%]">
                    <div className="text-2xl font-black">🎈 ספינת הצניחה — {world.name}</div>
                    {touch ? (
                        <button {...tap('jump')} className="px-10 py-4 mt-3 text-3xl font-black pointer-events-auto rounded-2xl bg-yellow-400 text-slate-900">
                            קפוץ!
                        </button>
                    ) : (
                        <div className="mt-2 text-xl font-bold">
                            לחץ <kbd className="px-2 py-0.5 rounded bg-white text-slate-900">רווח</kbd> כדי לקפוץ
                        </div>
                    )}
                </div>
            )}
            {(hud.state === 'dive' || hud.state === 'glide') && (
                <div className="absolute inset-x-0 text-lg font-bold text-center bottom-[22%]">
                    {hud.state === 'dive' ? 'צונח! W + מבט למטה = צניחה מהירה' : '🪂 רחפן פתוח'}
                </div>
            )}

            {/* prompt + progress */}
            <div className="absolute inset-x-0 flex flex-col items-center gap-2 bottom-[24%]">
                {hud.prompt && hud.alive && (
                    <div className="px-3 py-1.5 rounded-lg bg-black/60 font-bold flex items-center gap-2" style={{ borderBottom: `3px solid ${hud.prompt.color || '#facc15'}` }}>
                        {!touch && <kbd className="px-2 rounded bg-white text-slate-900">E</kbd>}
                        {hud.prompt.text}
                    </div>
                )}
                {(hud.reload !== null || hud.use) && (
                    <div className="w-48">
                        <div className="mb-1 text-xs font-bold text-center">{hud.use ? `משתמש ב${hud.use.name}...` : 'טוען מחדש...'}</div>
                        <div className="h-2 overflow-hidden rounded bg-black/50" dir="ltr">
                            <div className="h-full bg-yellow-400" style={{ width: `${(hud.use ? hud.use.progress : hud.reload) * 100}%` }} />
                        </div>
                    </div>
                )}
            </div>

            {/* health / shield / mats: bottom left */}
            {hud.state === 'ground' && (
                <div className={`absolute ${touch ? 'top-3 left-3 w-44' : 'bottom-4 left-4 w-64'} flex flex-col gap-1`} dir="rtl">
                    <Bar value={hud.shield} color="linear-gradient(90deg,#1d4ed8,#60a5fa)" icon="🛡️" />
                    <Bar value={hud.hp} color="linear-gradient(90deg,#15803d,#4ade80)" icon="❤️" />
                    <div className="text-sm font-black">🪵 {hud.mats} חומרים</div>
                </div>
            )}

            {/* inventory: bottom right */}
            {hud.state === 'ground' && (
                <div className={`absolute ${touch ? 'top-1 left-1/2 -translate-x-1/2 scale-[0.8] origin-top' : 'bottom-4 right-4'} flex flex-col items-end gap-1`}>
                    {hud.ammo && (
                        <div className="text-2xl font-black tabular-nums" dir="ltr">
                            {hud.ammo.mag} <span className="text-base text-white/70">/ {hud.ammo.reserve}</span>
                        </div>
                    )}
                    {hud.build ? (
                        <div className="flex gap-1" dir="ltr">
                            {Object.entries(BUILD_PIECES).map(([k, v]) => (
                                <div key={k} className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center font-bold ${hud.build === k ? 'bg-sky-500/80 ring-2 ring-white' : 'bg-black/50'}`}>
                                    <span className="text-xl">{k === 'wall' ? '🧱' : k === 'floor' ? '⬛' : '📐'}</span>
                                    <span className="text-xs">{v.name}</span>
                                    {!touch && <span className="text-[10px] text-white/60">{v.key}</span>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex gap-1" dir="ltr">
                            {hud.slots.map((s, i) => (
                                <button
                                    key={i}
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                        game()?.selectPlayerSlot(i);
                                    }}
                                    className={`pointer-events-auto relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg flex flex-col items-center justify-center overflow-hidden ${hud.active === i ? 'ring-2 ring-yellow-300 scale-110 z-10' : 'ring-1 ring-white/20'}`}
                                    style={{ background: s ? `linear-gradient(180deg, rgba(0,0,0,.55) 40%, ${s.color}cc)` : 'rgba(0,0,0,.35)' }}
                                >
                                    {s && (
                                        <>
                                            <span className="text-xl leading-none">{s.icon}</span>
                                            <span className="text-[10px] font-bold leading-tight">{s.name}</span>
                                            {s.mag !== undefined && <span className="absolute bottom-0 right-1 text-[10px] font-black">{s.mag}</span>}
                                            {s.count !== undefined && <span className="absolute bottom-0 right-1 text-xs font-black">×{s.count}</span>}
                                        </>
                                    )}
                                    {!touch && <span className="absolute top-0 left-1 text-[10px] text-white/60">{i + 1}</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* touch controls */}
            {touch && hud.alive && hud.state !== 'bus' && (
                <>
                    <div className="absolute w-28 h-28 rounded-full bottom-8 left-8 ring-2 ring-white/30 bg-white/5">
                        <div className="absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full top-1/2 left-1/2 bg-white/25" />
                    </div>
                    <div className="absolute flex gap-2 top-3 right-[134px] pointer-events-auto">
                        <TouchBtn label="⛶" sub="מפה" {...tap('map')} />
                        <TouchBtn label="⏸" sub="עצור" onPointerDown={() => game()?.pause()} />
                    </div>
                    <div className="absolute flex flex-col items-end gap-2 bottom-5 right-5 pointer-events-auto">
                        <div className="flex gap-2">
                            {hud.prompt && <TouchBtn label="✋" sub="אסוף" {...tap('interact')} big />}
                            <TouchBtn label="↻" sub="טען" {...tap('reload')} />
                            <TouchBtn label="🔁" sub="פריט" {...tap('slot')} />
                        </div>
                        <div className="flex gap-2">
                            <TouchBtn label={hud.build ? '✖' : '🧱'} sub={hud.build ? 'סגור' : 'בנה'} {...tap('build')} />
                            {hud.build && <TouchBtn label="⟳" sub={BUILD_PIECES[hud.build].name} {...tap('piece')} />}
                            <TouchBtn label="🎯" sub="כוון" {...tap('aim')} />
                            <TouchBtn label="⤒" sub="קפוץ" {...tap('jump')} />
                        </div>
                    </div>
                    <div className="absolute pointer-events-auto bottom-6 right-[270px]">
                        <button {...tap('fire')} className="flex items-center justify-center w-24 h-24 text-4xl rounded-full bg-red-500/70 ring-4 ring-white/40 active:bg-red-600">
                            {hud.build ? '🔨' : '💥'}
                        </button>
                    </div>
                </>
            )}

            {hud.inStorm && <div className="absolute inset-x-0 text-xl font-black text-center text-purple-200 top-[12%]">⚠️ אתה בתוך הסערה! רוץ למעגל</div>}
        </div>
    );
}

function TouchBtn({ label, sub, big, ...rest }) {
    return (
        <button {...rest} className={`${big ? 'w-16 h-16 bg-yellow-400/80 text-slate-900' : 'w-14 h-14 bg-black/45'} rounded-full flex flex-col items-center justify-center ring-1 ring-white/30 active:scale-95`}>
            <span className="text-xl leading-none">{label}</span>
            <span className="text-[10px] font-bold">{sub}</span>
        </button>
    );
}

// ---------------- results ----------------

function Results({ result, progress, onLobby, onPlay }) {
    const world = WORLDS[result.worldIndex];
    return (
        <div className="flex flex-col items-center min-h-screen gap-6 px-4 py-10 text-white storm-bg">
            <div className="text-center">
                <div className="text-lg text-white/70">
                    {world.emoji} {world.name}
                </div>
                <div className="font-black italic text-7xl sm:text-8xl" style={{ textShadow: '0 6px 0 #1e1b4b' }}>
                    #{result.place}
                </div>
                <div className="text-xl font-bold">{result.won ? '🏆 ניצחון אגדי!' : `מתוך ${result.total} שחקנים`}</div>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
                <Stat label="חיסולים" value={result.kills} />
                <Stat label="נזק" value={result.damage} />
                <Stat label="זמן" value={`${Math.floor(result.seconds / 60)}:${String(result.seconds % 60).padStart(2, '0')}`} />
            </div>
            {result.completed ? (
                <div className="w-full max-w-xl p-5 text-center rounded-3xl bg-green-500/20 ring-1 ring-green-300/40">
                    <div className="text-2xl font-black">✅ השלב הושלם!</div>
                    {result.newWorld && (
                        <div className="mt-1">
                            עולם חדש נפתח: <b>{result.newWorld.emoji} {result.newWorld.name}</b>
                        </div>
                    )}
                    {!result.newWorld && result.worldIndex === WORLDS.length - 1 && <div className="mt-1">סיימת את כל העולמות — אתה אגדה! 👑</div>}
                </div>
            ) : (
                <div className="w-full max-w-xl p-4 text-center rounded-3xl bg-black/30 ring-1 ring-white/10">
                    צריך לסיים בטופ 3 כדי לעבור לעולם הבא. נסה שוב — בנה קירות כשיורים עליך!
                </div>
            )}
            {result.newChar && (
                <div className="w-full max-w-xl overflow-hidden text-center rounded-3xl bg-gradient-to-b from-yellow-400/30 to-purple-700/40 ring-2 ring-yellow-300">
                    <div className="pt-4 text-2xl italic font-black">🎁 דמות חדשה נפתחה!</div>
                    <Preview look={result.newChar.look} className="w-full h-64" />
                    <div className="pb-4">
                        <div className="text-3xl italic font-black">{result.newChar.name}</div>
                        <div className="text-yellow-300">{result.newChar.title}</div>
                        <div className="text-sm">⭐ {result.newChar.perk}</div>
                    </div>
                </div>
            )}
            <div className="flex flex-wrap justify-center gap-3">
                {result.newWorld ? (
                    <button onClick={() => onPlay(progress.world)} className="px-8 py-3 text-2xl italic font-black rounded-2xl bg-yellow-400 text-slate-900 shadow-[0_5px_0_#a16207]">
                        לעולם הבא ▶
                    </button>
                ) : (
                    <button onClick={() => onPlay(result.worldIndex)} className="px-8 py-3 text-2xl italic font-black rounded-2xl bg-yellow-400 text-slate-900 shadow-[0_5px_0_#a16207]">
                        שחק שוב
                    </button>
                )}
                <button onClick={onLobby} className="px-6 py-3 text-xl font-bold rounded-2xl bg-white/15 hover:bg-white/25">
                    ללובי
                </button>
            </div>
        </div>
    );
}

function Stat({ label, value }) {
    return (
        <div className="px-6 py-3 text-center rounded-2xl bg-black/30 ring-1 ring-white/10">
            <div className="text-3xl font-black">{value}</div>
            <div className="text-sm text-white/70">{label}</div>
        </div>
    );
}
