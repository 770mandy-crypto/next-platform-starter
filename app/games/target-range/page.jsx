'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getGame, highScoreKey } from 'components/games/catalog';
import { useLang } from 'components/games/language';
import { initAudio, sfx } from 'components/games/sound';
import { readHighScore, saveHighScore } from 'components/games/storage';
import { GamePage, GameStage, Overlay } from 'components/games/ui';
import {
    clamp,
    drawParticles,
    fitCanvas,
    pointInCircle,
    pointerPos,
    rand,
    spawnBurst,
    updateParticles
} from 'components/games/utils';

const W = 560;
const H = 460;
const ROUND_SECONDS = 45;
const GAME = getGame('target-range');
const HI_KEY = highScoreKey('target-range');

function createState() {
    return {
        targets: [],
        particles: [],
        popups: [],
        crosshair: { x: W / 2, y: H / 2 },
        spawnTimer: 0.3,
        timeLeft: ROUND_SECONDS,
        score: 0,
        shots: 0,
        hits: 0,
        streak: 0,
        bestStreak: 0,
        over: false
    };
}

function spawnTarget(state) {
    const elapsed = ROUND_SECONDS - state.timeLeft;
    const isBarrel = Math.random() < clamp(0.1 + elapsed / 300, 0.1, 0.28);
    const radius = isBarrel ? rand(24, 32) : rand(18, 34) - elapsed * 0.12;

    state.targets.push({
        x: rand(45, W - 45),
        y: rand(45, H - 45),
        r: clamp(radius, 14, 34),
        life: isBarrel ? rand(1.4, 2.1) : Math.max(0.9, rand(1.9, 2.6) - elapsed * 0.02),
        maxLife: 0,
        isBarrel,
        born: 0
    });

    const target = state.targets[state.targets.length - 1];
    target.maxLife = target.life;
}

function addPopup(state, x, y, text, color) {
    state.popups.push({ x, y, text, color, life: 0.8 });
}

function update(state, dt) {
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        state.over = true;
    }

    state.spawnTimer -= dt;
    const maxTargets = 3 + Math.floor((ROUND_SECONDS - state.timeLeft) / 15);
    if (state.spawnTimer <= 0 && state.targets.length < maxTargets) {
        spawnTarget(state);
        state.spawnTimer = rand(0.35, 0.85);
    }

    for (let i = state.targets.length - 1; i >= 0; i--) {
        const target = state.targets[i];
        target.born += dt;
        target.life -= dt;
        if (target.life <= 0) {
            state.targets.splice(i, 1);
            if (!target.isBarrel) state.streak = 0;
        }
    }

    for (let i = state.popups.length - 1; i >= 0; i--) {
        const popup = state.popups[i];
        popup.y -= 40 * dt;
        popup.life -= dt;
        if (popup.life <= 0) state.popups.splice(i, 1);
    }

    updateParticles(state.particles, dt, 160);
}

function shoot(state, point) {
    if (state.over) return;
    state.shots += 1;

    for (let i = state.targets.length - 1; i >= 0; i--) {
        const target = state.targets[i];
        if (!pointInCircle(point, target)) continue;

        state.targets.splice(i, 1);

        if (target.isBarrel) {
            state.score = Math.max(0, state.score - 60);
            state.streak = 0;
            sfx.explode();
            spawnBurst(state.particles, target.x, target.y, '#ef4444', 22, 260);
            addPopup(state, target.x, target.y, '-60', '#fca5a5');
            return;
        }

        state.hits += 1;
        state.streak += 1;
        state.bestStreak = Math.max(state.bestStreak, state.streak);

        const freshness = clamp(target.life / target.maxLife, 0, 1);
        const sizeBonus = Math.round((34 - target.r) * 1.6);
        const multiplier = 1 + Math.min(state.streak - 1, 9) * 0.1;
        const points = Math.round((30 + sizeBonus + freshness * 30) * multiplier);

        state.score += points;
        sfx.pop();
        spawnBurst(state.particles, target.x, target.y, '#fbbf24', 16, 200);
        addPopup(state, target.x, target.y, `+${points}`, '#fde68a');
        return;
    }

    state.streak = 0;
    sfx.miss();
    spawnBurst(state.particles, point.x, point.y, '#94a3b8', 6, 90);
}

function drawTarget(ctx, target) {
    const pop = Math.min(1, target.born * 8);
    const fade = clamp(target.life / target.maxLife, 0, 1);

    ctx.save();
    ctx.translate(target.x, target.y);
    ctx.scale(pop, pop);
    ctx.globalAlpha = 0.35 + fade * 0.65;

    if (target.isBarrel) {
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.roundRect(-target.r * 0.7, -target.r, target.r * 1.4, target.r * 2, 6);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.roundRect(-target.r * 0.7, -target.r * 0.25, target.r * 1.4, target.r * 0.5, 3);
        ctx.fill();
        ctx.fillStyle = '#7f1d1d';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☠', 0, 0);
    } else {
        const rings = ['#f8fafc', '#ef4444', '#f8fafc', '#ef4444'];
        for (let i = 0; i < rings.length; i++) {
            ctx.fillStyle = rings[i];
            ctx.beginPath();
            ctx.arc(0, 0, target.r * (1 - i * 0.24), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, target.r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fade);
    ctx.stroke();
    ctx.restore();
}

function draw(ctx, state) {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0f766e');
    sky.addColorStop(1, '#134e4a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }

    for (const target of state.targets) drawTarget(ctx, target);
    drawParticles(ctx, state.particles);

    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const popup of state.popups) {
        ctx.globalAlpha = clamp(popup.life / 0.8, 0, 1);
        ctx.fillStyle = popup.color;
        ctx.fillText(popup.text, popup.x, popup.y);
    }
    ctx.globalAlpha = 1;

    if (state.streak > 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`x${state.streak}`, W / 2, 30);
    }

    const { x, y } = state.crosshair;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.moveTo(x - 22, y);
    ctx.lineTo(x - 6, y);
    ctx.moveTo(x + 6, y);
    ctx.lineTo(x + 22, y);
    ctx.moveTo(x, y - 22);
    ctx.lineTo(x, y - 6);
    ctx.moveTo(x, y + 6);
    ctx.lineTo(x, y + 22);
    ctx.stroke();
}

export default function TargetRangePage() {
    const { t, lang } = useLang();
    const canvasRef = useRef(null);
    const stateRef = useRef(null);
    const hudRef = useRef('');
    const [status, setStatus] = useState('idle');
    const [hud, setHud] = useState({ score: 0, timeLeft: ROUND_SECONDS, streak: 0, accuracy: 100 });
    const [best, setBest] = useState(0);
    const [isRecord, setIsRecord] = useState(false);

    useEffect(() => {
        setBest(readHighScore(HI_KEY));
        stateRef.current = createState();
        const canvas = canvasRef.current;
        if (canvas) draw(fitCanvas(canvas, W, H), stateRef.current);
    }, []);

    const start = useCallback(() => {
        initAudio();
        stateRef.current = createState();
        setHud({ score: 0, timeLeft: ROUND_SECONDS, streak: 0, accuracy: 100 });
        setIsRecord(false);
        setStatus('running');
    }, []);

    useEffect(() => {
        if (status !== 'running') return;

        const canvas = canvasRef.current;
        const ctx = fitCanvas(canvas, W, H);
        const state = stateRef.current;
        let frame = 0;
        let last = performance.now();

        const onPointerMove = (event) => {
            state.crosshair = pointerPos(canvas, event, W, H);
        };

        const onPointerDown = (event) => {
            event.preventDefault();
            const point = pointerPos(canvas, event, W, H);
            state.crosshair = point;
            shoot(state, point);
        };

        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerdown', onPointerDown);

        const loop = (now) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;

            update(state, dt);
            draw(ctx, state);

            const accuracy = state.shots ? Math.round((state.hits / state.shots) * 100) : 100;
            const snapshot = `${state.score}|${Math.ceil(state.timeLeft)}|${state.streak}|${accuracy}`;
            if (snapshot !== hudRef.current) {
                hudRef.current = snapshot;
                setHud({ score: state.score, timeLeft: Math.ceil(state.timeLeft), streak: state.streak, accuracy });
            }

            if (state.over) {
                setIsRecord(saveHighScore(HI_KEY, state.score));
                setBest(readHighScore(HI_KEY));
                setStatus('over');
                return;
            }
            frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(frame);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerdown', onPointerDown);
        };
    }, [status]);

    return (
        <GamePage
            game={GAME}
            stats={[
                { label: t('ניקוד', 'Score'), value: hud.score },
                {
                    label: t('זמן', 'Time'),
                    value: `${hud.timeLeft}s`,
                    tone: hud.timeLeft <= 10 ? 'bad' : 'default'
                },
                { label: t('רצף', 'Streak'), value: `x${hud.streak}`, tone: hud.streak > 4 ? 'good' : 'default' },
                { label: t('דיוק', 'Accuracy'), value: `${hud.accuracy}%` },
                { label: t('שיא', 'Best'), value: best }
            ]}
        >
            <GameStage canvasRef={canvasRef} width={W} height={H}>
                {status === 'idle' && (
                    <Overlay
                        emoji="🎯"
                        title={t('קח נשימה, כוון', 'Take aim')}
                        lines={[GAME[lang].description]}
                        actionLabel={t('התחל סבב', 'Start round')}
                        onAction={start}
                    />
                )}
                {status === 'over' && (
                    <Overlay
                        emoji={isRecord ? '🏆' : '⏱️'}
                        title={isRecord ? t('שיא חדש!', 'New record!') : t('נגמר הזמן', "Time's up")}
                        lines={[
                            t(`ניקוד: ${hud.score}`, `Score: ${hud.score}`),
                            t(`דיוק: ${hud.accuracy}%`, `Accuracy: ${hud.accuracy}%`),
                            t(
                                `הרצף הארוך ביותר: ${stateRef.current?.bestStreak ?? 0}`,
                                `Longest streak: ${stateRef.current?.bestStreak ?? 0}`
                            )
                        ]}
                        actionLabel={t('סבב נוסף', 'Play again')}
                        onAction={start}
                    />
                )}
            </GameStage>
        </GamePage>
    );
}
