'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { addCoins, loadout, newSave, normalizeSave, recordScore } from 'lib/game/catalog';
import { BLOCK, CABLE, COIN_RADIUS, DRONE_RADIUS, GRID, newGame, RING, step, WORLD } from 'lib/game/engine';
import { Shop } from './shop';

const SAVE_KEY = 'neon-city-save';

// The save lives in this browser only. Storage can be unavailable (private
// mode, blocked site data); the game then still runs, it just won't remember.
function loadSave() {
    try {
        return normalizeSave(JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'));
    } catch {
        return newSave();
    }
}
function storeSave(save) {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch {}
}

export function NeonCity() {
    const canvasRef = useRef(null);
    const gameRef = useRef(null);
    const saveRef = useRef(null);
    const bankedRef = useRef(0);
    const input = useRef({ keys: new Set(), mouse: null, mouseDown: false, touchFire: false, stick: null, usingTouch: false });
    const [save, setSave] = useState(null);
    const [phase, setPhase] = useState('menu'); // menu | playing | paused | over
    const [shopOpen, setShopOpen] = useState(false);
    const [hud, setHud] = useState({ coins: 0, health: 1, wave: 1, score: 0, run: 0 });
    const [stick, setStick] = useState(null);
    const ready = save !== null;

    useEffect(() => {
        const loaded = loadSave();
        saveRef.current = loaded;
        setSave(loaded);
    }, []);

    const updateSave = useCallback((next) => {
        saveRef.current = next;
        setSave(next);
        storeSave(next);
    }, []);

    const start = useCallback(() => {
        gameRef.current = newGame(loadout(saveRef.current));
        bankedRef.current = 0;
        // Development only: lets automated checks reach the game state.
        if (process.env.NODE_ENV === 'development') window.__neonCity = gameRef.current;
        setPhase('playing');
    }, []);

    // --- Keyboard and mouse
    useEffect(() => {
        const keys = input.current.keys;
        const down = (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
            keys.add(e.key.toLowerCase());
            if (e.key.toLowerCase() === 'e') input.current.exitRide = true;
            if (e.key === 'Escape') setPhase((p) => (p === 'playing' ? 'paused' : p === 'paused' ? 'playing' : p));
        };
        const up = (e) => keys.delete(e.key.toLowerCase());
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
        };
    }, []);

    // --- The game loop: simulate, then draw
    useEffect(() => {
        if (phase !== 'playing') return undefined;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let frame;
        let last = performance.now();
        let hudTimer = 0;

        const loop = (now) => {
            const dt = (now - last) / 1000;
            last = now;
            const game = gameRef.current;
            const events = step(game, readInput(input.current, canvas, game), dt);

            if (events.coins) {
                const whole = Math.floor(game.coinsThisRun) - bankedRef.current;
                if (whole > 0) {
                    bankedRef.current += whole;
                    const next = addCoins(saveRef.current, whole);
                    saveRef.current = next;
                    storeSave(next);
                }
            }
            draw(ctx, canvas, game);

            hudTimer -= dt;
            if (hudTimer <= 0 || game.over) {
                hudTimer = 0.1;
                setHud({ coins: saveRef.current.coins, health: game.car.health / game.car.maxHealth, wave: game.wave, score: Math.floor(game.score), run: Math.floor(game.coinsThisRun), riding: game.ride?.line ?? null, nearStation: game.nearStation });
            }
            if (game.over) {
                const next = recordScore(saveRef.current, game.score);
                updateSave(next);
                setPhase('over');
                return;
            }
            frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frame);
    }, [phase, updateSave]);

    // Keep the canvas sharp and full-screen.
    useEffect(() => {
        const resize = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = window.innerWidth * ratio;
            canvas.height = window.innerHeight * ratio;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            if (gameRef.current) draw(canvas.getContext('2d'), canvas, gameRef.current);
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
        // The canvas only exists once the save has loaded, so size it then.
    }, [ready]);

    // --- Pointer: mouse aims and fires; touch on the left half is a joystick
    const onPointerDown = (e) => {
        const state = input.current;
        if (e.pointerType === 'touch') {
            state.usingTouch = true;
            if (e.clientX < window.innerWidth / 2 && !state.stick) {
                state.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
                setStick({ ...state.stick });
                e.currentTarget.setPointerCapture(e.pointerId);
            }
            return;
        }
        state.usingTouch = false;
        state.mouseDown = true;
        state.mouse = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e) => {
        const state = input.current;
        if (state.stick && e.pointerId === state.stick.id) {
            state.stick.x = e.clientX;
            state.stick.y = e.clientY;
            setStick({ ...state.stick });
        } else if (e.pointerType !== 'touch') {
            state.mouse = { x: e.clientX, y: e.clientY };
        }
    };
    const onPointerUp = (e) => {
        const state = input.current;
        if (state.stick && e.pointerId === state.stick.id) {
            state.stick = null;
            setStick(null);
        }
        if (e.pointerType !== 'touch') state.mouseDown = false;
    };

    if (!save) return <div className="grid h-[100dvh] place-items-center text-slate-400">טוען…</div>;
    const kit = loadout(save);

    return (
        <div className="relative h-[100dvh] w-full overflow-hidden select-none">
            <canvas
                ref={canvasRef}
                className="absolute inset-0 touch-none"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onContextMenu={(e) => e.preventDefault()}
            />

            {phase !== 'menu' && (
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-3 p-3">
                    <div className="pointer-events-auto flex gap-2">
                        <button type="button" onClick={() => setPhase('paused')} className="rounded-xl bg-slate-900/80 px-3 py-2 text-lg" aria-label="השהיה">
                            ⏸
                        </button>
                    </div>
                    <div className="flex-1">
                        <div className="mx-auto h-3 max-w-xs overflow-hidden rounded-full bg-slate-800/80 ring-1 ring-white/10">
                            <div
                                className="h-full rounded-full transition-[width]"
                                style={{ width: `${hud.health * 100}%`, background: hud.health > 0.35 ? '#22d3ee' : '#f43f5e' }}
                            />
                        </div>
                        <div className="mt-1 text-center text-xs font-bold text-slate-300">
                            גל {hud.wave} · ניקוד {hud.score}
                        </div>
                    </div>
                    <div className="rounded-xl bg-slate-900/80 px-3 py-2 font-black text-amber-300">🪙 {hud.coins}</div>
                </div>
            )}

            {phase === 'playing' && (hud.riding || hud.nearStation) && (
                <div className="pointer-events-none absolute inset-x-0 top-20 flex flex-col items-center gap-2 text-center">
                    <span className={`rounded-full px-4 py-2 text-sm font-black text-slate-950 ${hud.riding === 'ring' ? 'bg-cyan-400/90' : 'bg-amber-500/90'}`}>
                        {hud.riding === 'ring'
                            ? '🚡 קו הטבעת: עוצר על כל גג ואוסף את המטבעות שעליו'
                            : hud.riding
                              ? '🚡 ברכבל: הרחפנים לא יכולים לפגוע בך'
                              : '🚡 עצרו על התחנה כדי לעלות לרכבל'}
                    </span>
                    {hud.riding === 'ring' && (
                        <button
                            type="button"
                            onClick={() => (input.current.exitRide = true)}
                            className="pointer-events-auto rounded-full bg-slate-900/90 px-5 py-2 text-sm font-black ring-2 ring-cyan-400"
                        >
                            ⬇ לרדת לרחוב (E)
                        </button>
                    )}
                </div>
            )}
            {phase === 'playing' && input.current.usingTouch && (
                <button
                    type="button"
                    className="absolute bottom-8 right-8 grid size-24 place-items-center rounded-full bg-rose-600/80 text-3xl font-black shadow-[0_0_30px_#e11d48] active:scale-95"
                    onPointerDown={() => (input.current.touchFire = true)}
                    onPointerUp={() => (input.current.touchFire = false)}
                    onPointerLeave={() => (input.current.touchFire = false)}
                    aria-label="ירי"
                >
                    🔥
                </button>
            )}
            {stick && (
                <div className="pointer-events-none absolute" style={{ left: stick.ox - 60, top: stick.oy - 60 }}>
                    <div className="size-[120px] rounded-full border-2 border-white/25 bg-white/5" />
                    <div
                        className="absolute size-12 rounded-full bg-cyan-400/70"
                        style={{
                            left: 36 + Math.max(-50, Math.min(50, stick.x - stick.ox)),
                            top: 36 + Math.max(-50, Math.min(50, stick.y - stick.oy))
                        }}
                    />
                </div>
            )}

            {phase === 'menu' && (
                <Overlay>
                    <h1 className="mb-2 bg-gradient-to-l from-fuchsia-400 via-pink-400 to-cyan-300 bg-clip-text text-5xl font-black text-transparent sm:text-6xl">עיר הניאון</h1>
                    <p className="mb-6 text-slate-300">רחפנים רובוטיים השתלטו על העיר. נוהגים, יורים, אוספים מטבעות ומשדרגים. ויש שני קווי רכבל 🚡: אחד חוצה את העיר, והשני מקיף אותה ועוצר על כל גג.</p>
                    <Kit kit={kit} />
                    <div className="flex flex-wrap justify-center gap-3">
                        <BigButton onClick={start}>▶ להתחיל</BigButton>
                        <BigButton onClick={() => setShopOpen(true)} secondary>
                            🛒 לחנות (🪙 {save.coins})
                        </BigButton>
                    </div>
                    <Controls />
                    {save.best > 0 && <p className="mt-4 text-sm text-slate-400">השיא שלך: {save.best}</p>}
                </Overlay>
            )}
            {phase === 'paused' && (
                <Overlay>
                    <h2 className="mb-6 text-4xl font-black">הפסקה</h2>
                    <div className="flex flex-wrap justify-center gap-3">
                        <BigButton onClick={() => setPhase('playing')}>▶ להמשיך</BigButton>
                        <BigButton onClick={() => setShopOpen(true)} secondary>
                            🛒 לחנות
                        </BigButton>
                        <BigButton onClick={() => setPhase('menu')} secondary>
                            לתפריט
                        </BigButton>
                    </div>
                    <p className="mt-4 text-sm text-slate-400">ציוד חדש מהחנות נכנס לשימוש במשחק הבא.</p>
                </Overlay>
            )}
            {phase === 'over' && (
                <Overlay>
                    <h2 className="mb-2 text-4xl font-black text-rose-400">המכונית הושמדה</h2>
                    <p className="mb-1 text-xl">
                        אספת <b className="text-amber-300">🪙 {hud.run}</b> מטבעות
                    </p>
                    <p className="mb-6 text-slate-400">
                        ניקוד {hud.score} · שיא {save.best}
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <BigButton onClick={start}>↻ עוד סיבוב</BigButton>
                        <BigButton onClick={() => setShopOpen(true)} secondary>
                            🛒 לחנות (🪙 {save.coins})
                        </BigButton>
                    </div>
                </Overlay>
            )}

            {shopOpen && <Shop save={save} onChange={updateSave} onClose={() => setShopOpen(false)} />}
        </div>
    );
}

function Overlay({ children }) {
    return <div className="absolute inset-0 z-20 grid place-items-center overflow-y-auto bg-slate-950/80 p-6 text-center backdrop-blur-sm"><div className="max-w-lg">{children}</div></div>;
}

function BigButton({ children, onClick, secondary = false }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-2xl px-7 py-3.5 text-lg font-black ${secondary ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gradient-to-l from-fuchsia-600 to-cyan-500 shadow-[0_0_30px_#c026d3aa] hover:brightness-110'}`}
        >
            {children}
        </button>
    );
}

function Kit({ kit }) {
    return (
        <div className="mb-6 flex justify-center gap-3 text-sm">
            {[kit.weapon, kit.car, kit.character].map((item) => (
                <div key={item.id} className="rounded-xl bg-slate-900 px-3 py-2 ring-1 ring-slate-800">
                    <div className="text-2xl">{item.icon}</div>
                    <div className="font-bold">{item.name}</div>
                </div>
            ))}
        </div>
    );
}

function Controls() {
    return (
        <div className="mt-6 grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-900/70 p-3">
                <b className="text-slate-200">🖥️ מחשב</b>
                <br />
                חיצים או WASD לנהיגה, העכבר מכוון, לחיצה (או רווח) יורה.
            </div>
            <div className="rounded-xl bg-slate-900/70 p-3">
                <b className="text-slate-200">📱 טלפון</b>
                <br />
                אצבע בצד שמאל של המסך נוהגת (כמו ג׳ויסטיק), הכפתור 🔥 מימין יורה, והכוונה אוטומטית.
            </div>
        </div>
    );
}

// --- Input → the engine's input shape

function readInput(state, canvas, game) {
    const k = state.keys;
    const throttle = (k.has('arrowup') || k.has('w') ? 1 : 0) - (k.has('arrowdown') || k.has('s') ? 1 : 0);
    // The car turns the way the arrow points on screen.
    const turn = (k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0);
    const result = { throttle, turn, steerAngle: 0, steerPower: 0, aimAngle: null, firing: false, exitRide: Boolean(state.exitRide) };
    state.exitRide = false;

    if (state.stick) {
        const dx = state.stick.x - state.stick.ox;
        const dy = state.stick.y - state.stick.oy;
        result.steerAngle = Math.atan2(dy, dx);
        result.steerPower = Math.min(1, Math.hypot(dx, dy) / 50);
    }
    if (state.usingTouch) {
        result.firing = state.touchFire;
    } else {
        if (state.mouse && canvas) {
            // The car is always drawn at the centre of the screen.
            result.aimAngle = Math.atan2(state.mouse.y - window.innerHeight / 2, state.mouse.x - window.innerWidth / 2);
        }
        result.firing = state.mouseDown || k.has(' ');
    }
    return result;
}

// --- Drawing

function draw(ctx, canvas, game) {
    const ratio = canvas.width / window.innerWidth;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const { car } = game;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#05060f';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2 - car.x, h / 2 - car.y);
    const view = { x0: car.x - w / 2 - 50, y0: car.y - h / 2 - 50, x1: car.x + w / 2 + 50, y1: car.y + h / 2 + 50 };

    // Asphalt, then lane markings along every road.
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, WORLD, WORLD);
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.25)';
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 26]);
    ctx.beginPath();
    for (let k = 0; k <= GRID; k += 1) {
        ctx.moveTo(k * BLOCK, 0);
        ctx.lineTo(k * BLOCK, WORLD);
        ctx.moveTo(0, k * BLOCK);
        ctx.lineTo(WORLD, k * BLOCK);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Neon buildings, only those on screen.
    for (const b of game.buildings) {
        if (b.x > view.x1 || b.y > view.y1 || b.x + b.w < view.x0 || b.y + b.h < view.y0) continue;
        ctx.fillStyle = `hsl(${b.hue} 55% 9%)`;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = `hsl(${b.hue} 95% 60% / 0.25)`;
        ctx.lineWidth = 10;
        ctx.strokeRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
        ctx.strokeStyle = `hsl(${b.hue} 95% 62%)`;
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
        // Lit windows
        ctx.fillStyle = `hsl(${b.hue} 90% 70% / 0.18)`;
        for (let wx = b.x + 30; wx < b.x + b.w - 30; wx += 44) {
            for (let wy = b.y + 30; wy < b.y + b.h - 30; wy += 44) {
                if ((wx * 7 + wy * 13) % 5 < 2) ctx.fillRect(wx, wy, 18, 18);
            }
        }
    }

    // Ring-line roofs: a landing pad on each, with the coins waiting there.
    for (const roof of RING.roofs) {
        if (roof.x < view.x0 - 60 || roof.x > view.x1 + 60 || roof.y < view.y0 - 60 || roof.y > view.y1 + 60) continue;
        ctx.fillStyle = 'rgba(34, 211, 238, 0.12)';
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.7)';
        ctx.lineWidth = 2;
        roundRect(ctx, roof.x - 42, roof.y - 42, 84, 84, 10);
        ctx.fill();
        ctx.stroke();
        const count = game.roofCoins[roof.id].count;
        for (let i = 0; i < count; i += 1) {
            ctx.fillStyle = '#facc15';
            ctx.strokeStyle = '#a16207';
            ctx.beginPath();
            ctx.ellipse(roof.x - 18 + i * 18, roof.y + 4, 9, 9 * (0.4 + 0.6 * Math.abs(Math.sin(game.time * 3 + i))), 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }

    // Cable-car stations: glowing pads on the road (amber: cross line,
    // cyan: ring line).
    for (const st of [...CABLE.stations, ...RING.stations]) {
        const ring = RING.stations.includes(st);
        ctx.fillStyle = ring ? 'rgba(34, 211, 238, 0.12)' : 'rgba(251, 191, 36, 0.12)';
        ctx.beginPath();
        ctx.arc(st.x, st.y, CABLE.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = ring ? '#22d3ee' : '#fbbf24';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚡', st.x, st.y - CABLE.radius - 22);
        ctx.font = 'bold 14px Heebo, sans-serif';
        ctx.fillStyle = ring ? '#a5f3fc' : '#fde68a';
        ctx.fillText(st.name, st.x, st.y + CABLE.radius + 16);
    }

    // Coins
    const spin = Math.abs(Math.sin(game.time * 4));
    for (const c of game.coins) {
        if (c.x < view.x0 || c.x > view.x1 || c.y < view.y0 || c.y > view.y1) continue;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, COIN_RADIUS * (0.35 + 0.65 * spin), COIN_RADIUS, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#a16207';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Bullets
    ctx.strokeStyle = game.kit.weapon.color;
    ctx.lineWidth = game.kit.weapon.splash ? 6 : 3;
    ctx.lineCap = 'round';
    for (const b of game.bullets) {
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.vx * 0.025, b.y - b.vy * 0.025);
        ctx.stroke();
    }

    // Drones
    for (const d of game.drones) {
        if (d.x < view.x0 || d.x > view.x1 || d.y < view.y0 || d.y > view.y1) continue;
        ctx.strokeStyle = '#fda4af';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i += 1) {
            const a = d.spin + (i * Math.PI) / 2;
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x + Math.cos(a) * (DRONE_RADIUS + 6), d.y + Math.sin(a) * (DRONE_RADIUS + 6));
            ctx.stroke();
        }
        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.arc(d.x, d.y, DRONE_RADIUS - 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff1f2';
        ctx.beginPath();
        ctx.arc(d.x, d.y, 4, 0, Math.PI * 2);
        ctx.fill();
        if (d.health < d.maxHealth) {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(d.x - 18, d.y - 30, 36, 4);
            ctx.fillStyle = '#4ade80';
            ctx.fillRect(d.x - 18, d.y - 30, 36 * (d.health / d.maxHealth), 4);
        }
    }

    // Explosions
    for (const e of game.effects) {
        ctx.strokeStyle = e.color;
        ctx.globalAlpha = Math.max(0, e.t * 2.5);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * (1.2 - e.t * 2), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // The car, with the driver and a turret pointing where it aims. In the
    // cable car it rides inside the gondola, drawn with the cable below.
    if (!game.ride) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.shadowColor = game.kit.car.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = game.kit.car.color;
    roundRect(ctx, -26, -15, 52, 30, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0f172a';
    roundRect(ctx, 2, -11, 12, 22, 3);
    ctx.fill();
    ctx.fillStyle = '#fef9c3';
    ctx.fillRect(22, -12, 5, 6);
    ctx.fillRect(22, 6, 5, 6);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-27, -12, 3, 6);
    ctx.fillRect(-27, 6, 3, 6);
    ctx.restore();

    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(game.aim ?? car.angle);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, -3, 26, 6);
    ctx.fillStyle = game.kit.character.color;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    }

    drawCable(ctx, game);
    ctx.restore();

    drawMinimap(ctx, game, w);
}

// The cable overhead (above roofs and drones), its towers, and the gondola.
function drawCable(ctx, game) {
    const [a, b] = CABLE.stations;
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.7)';
    ctx.lineWidth = 2;
    for (const offset of [-5, 5]) {
        ctx.beginPath();
        ctx.moveTo(a.x + offset, a.y - offset);
        ctx.lineTo(b.x + offset, b.y - offset);
        ctx.stroke();
    }
    for (let i = 1; i < 6; i += 1) {
        const x = a.x + ((b.x - a.x) * i) / 6;
        const y = a.y + ((b.y - a.y) * i) / 6;
        ctx.fillStyle = '#475569';
        ctx.fillRect(x - 9, y - 9, 18, 18);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 9, y - 9, 18, 18);
    }
    // The ring line: a closed loop through every edge roof, with a pylon on each.
    ctx.strokeStyle = 'rgba(165, 243, 252, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    RING.roofs.forEach((roof, i) => (i ? ctx.lineTo(roof.x, roof.y) : ctx.moveTo(roof.x, roof.y)));
    ctx.closePath();
    ctx.stroke();
    for (const roof of RING.roofs) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(roof.x - 6, roof.y - 6, 12, 12);
    }
    for (const st of RING.stations) {
        // The short cable from each ring station up to its first roof.
        const entry = RING.roofs.reduce((best, roof) => (Math.hypot(roof.x - st.x, roof.y - st.y) < Math.hypot(best.x - st.x, best.y - st.y) ? roof : best));
        ctx.beginPath();
        ctx.moveTo(st.x, st.y);
        ctx.lineTo(entry.x, entry.y);
        ctx.stroke();
    }

    if (!game.ride) return;
    const ringRide = game.ride.line === 'ring';
    const { x, y } = game.car;
    ctx.save();
    ctx.translate(x, y);
    // A soft shadow on the street far below.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(18, 26, 30, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = ringRide ? '#22d3ee' : '#fbbf24';
    ctx.shadowBlur = 20;
    ctx.fillStyle = ringRide ? '#06b6d4' : '#f59e0b';
    roundRect(ctx, -30, -22, 60, 44, 9);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = ringRide ? '#ecfeff' : '#7dd3fc';
    for (const wx of [-22, -4, 14]) {
        roundRect(ctx, wx, -14, 12, 12, 2);
        ctx.fill();
    }
    ctx.fillStyle = game.kit.character.color;
    ctx.beginPath();
    ctx.arc(2, 9, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawMinimap(ctx, game, w) {
    const size = 110;
    const x0 = w - size - 12;
    const y0 = 60;
    const scale = size / WORLD;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
    ctx.fillRect(x0, y0, size, size);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.strokeRect(x0, y0, size, size);
    const [a, b] = CABLE.stations;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x0 + a.x * scale, y0 + a.y * scale);
    ctx.lineTo(x0 + b.x * scale, y0 + b.y * scale);
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    for (const st of CABLE.stations) ctx.fillRect(x0 + st.x * scale - 2.5, y0 + st.y * scale - 2.5, 5, 5);
    ctx.strokeStyle = '#22d3ee';
    ctx.beginPath();
    RING.roofs.forEach((roof, i) => (i ? ctx.lineTo(x0 + roof.x * scale, y0 + roof.y * scale) : ctx.moveTo(x0 + roof.x * scale, y0 + roof.y * scale)));
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = '#22d3ee';
    for (const st of RING.stations) ctx.fillRect(x0 + st.x * scale - 2.5, y0 + st.y * scale - 2.5, 5, 5);
    ctx.fillStyle = 'rgba(244, 63, 94, 0.9)';
    for (const d of game.drones) ctx.fillRect(x0 + d.x * scale - 1.5, y0 + d.y * scale - 1.5, 3, 3);
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(x0 + game.car.x * scale, y0 + game.car.y * scale, 3.5, 0, Math.PI * 2);
    ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

