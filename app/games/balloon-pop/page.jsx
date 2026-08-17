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
    pick,
    pointInCircle,
    pointerPos,
    rand,
    spawnBurst,
    updateParticles
} from 'components/games/utils';

const W = 480;
const H = 620;
const GAME = getGame('balloon-pop');
const HI_KEY = highScoreKey('balloon-pop');

const BALLOON_COLORS = ['#ff5d8f', '#ffd23f', '#4cc9f0', '#7bf1a8', '#b388ff', '#fb923c'];

function createState() {
    return {
        balloons: [],
        particles: [],
        popups: [],
        clouds: Array.from({ length: 5 }, () => ({
            x: rand(0, W),
            y: rand(40, H - 120),
            scale: rand(0.6, 1.4),
            speed: rand(6, 18)
        })),
        spawnTimer: 0.4,
        elapsed: 0,
        score: 0,
        lives: 3,
        popped: 0,
        streak: 0,
        over: false,
        shake: 0
    };
}

function spawnBalloon(state) {
    const isBomb = state.elapsed > 8 && Math.random() < clamp(0.1 + state.elapsed / 260, 0.1, 0.3);
    const radius = isBomb ? 24 : rand(18, 30);

    state.balloons.push({
        x: rand(radius + 12, W - radius - 12),
        y: H + radius + 10,
        r: radius,
        isBomb,
        color: isBomb ? '#1f2937' : pick(BALLOON_COLORS),
        speed: (isBomb ? 70 : 62 + (30 - radius) * 2.2) + state.elapsed * 1.6,
        sway: rand(0.5, 1.5),
        phase: rand(0, Math.PI * 2)
    });
}

function addPopup(state, x, y, text, color) {
    state.popups.push({ x, y, text, color, life: 0.8 });
}

function loseLife(state) {
    state.lives -= 1;
    state.streak = 0;
    state.shake = 0.4;
    if (state.lives <= 0) {
        state.over = true;
        sfx.gameOver();
    }
}

function update(state, dt) {
    state.elapsed += dt;
    state.shake = Math.max(0, state.shake - dt);

    for (const cloud of state.clouds) {
        cloud.x += cloud.speed * dt;
        if (cloud.x - 60 * cloud.scale > W) {
            cloud.x = -60 * cloud.scale;
            cloud.y = rand(40, H - 140);
        }
    }

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
        spawnBalloon(state);
        state.spawnTimer = Math.max(0.28, 1.1 - state.elapsed * 0.02);
    }

    for (let i = state.balloons.length - 1; i >= 0; i--) {
        const balloon = state.balloons[i];
        balloon.phase += dt * balloon.sway * 2;
        balloon.y -= balloon.speed * dt;
        balloon.x += Math.cos(balloon.phase) * 26 * dt;
        balloon.x = clamp(balloon.x, balloon.r, W - balloon.r);

        if (balloon.y + balloon.r < 0) {
            state.balloons.splice(i, 1);
            if (!balloon.isBomb) {
                sfx.miss();
                loseLife(state);
            }
        }
    }

    for (let i = state.popups.length - 1; i >= 0; i--) {
        const popup = state.popups[i];
        popup.y -= 40 * dt;
        popup.life -= dt;
        if (popup.life <= 0) state.popups.splice(i, 1);
    }

    updateParticles(state.particles, dt, 200);
}

function shoot(state, point) {
    if (state.over) return;

    for (let i = state.balloons.length - 1; i >= 0; i--) {
        const balloon = state.balloons[i];
        if (!pointInCircle(point, balloon)) continue;

        state.balloons.splice(i, 1);

        if (balloon.isBomb) {
            sfx.explode();
            spawnBurst(state.particles, balloon.x, balloon.y, '#ef4444', 26, 280);
            addPopup(state, balloon.x, balloon.y, '💥', '#fca5a5');
            loseLife(state);
            return;
        }

        state.popped += 1;
        state.streak += 1;
        const multiplier = 1 + Math.min(state.streak - 1, 9) * 0.1;
        const points = Math.round((10 + (30 - balloon.r)) * multiplier);
        state.score += points;

        sfx.pop();
        spawnBurst(state.particles, balloon.x, balloon.y, balloon.color, 18, 220);
        addPopup(state, balloon.x, balloon.y, `+${points}`, balloon.color);
        return;
    }

    state.streak = 0;
    sfx.miss();
    spawnBurst(state.particles, point.x, point.y, '#e2e8f0', 5, 80);
}

function drawBalloon(ctx, balloon) {
    ctx.save();
    ctx.translate(balloon.x, balloon.y);

    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, balloon.r * 1.15);
    ctx.quadraticCurveTo(6, balloon.r * 1.6, 0, balloon.r * 2);
    ctx.stroke();

    ctx.fillStyle = balloon.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, balloon.r * 0.85, balloon.r, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-4, balloon.r * 0.98);
    ctx.lineTo(4, balloon.r * 0.98);
    ctx.lineTo(0, balloon.r * 1.2);
    ctx.closePath();
    ctx.fill();

    if (balloon.isBomb) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = `bold ${Math.round(balloon.r)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💣', 0, 0);
    } else {
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath();
        ctx.ellipse(-balloon.r * 0.3, -balloon.r * 0.35, balloon.r * 0.18, balloon.r * 0.26, -0.5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function drawCloud(ctx, cloud) {
    ctx.save();
    ctx.translate(cloud.x, cloud.y);
    ctx.scale(cloud.scale, cloud.scale);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.arc(-24, 6, 20, 0, Math.PI * 2);
    ctx.arc(0, -6, 26, 0, Math.PI * 2);
    ctx.arc(26, 6, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function draw(ctx, state) {
    ctx.save();
    if (state.shake > 0) ctx.translate(rand(-5, 5) * state.shake, rand(-5, 5) * state.shake);

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0ea5e9');
    sky.addColorStop(0.6, '#38bdf8');
    sky.addColorStop(1, '#a7f3d0');
    ctx.fillStyle = sky;
    ctx.fillRect(-20, -20, W + 40, H + 40);

    for (const cloud of state.clouds) drawCloud(ctx, cloud);
    for (const balloon of state.balloons) drawBalloon(ctx, balloon);
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
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.fillText(`x${state.streak}`, W / 2, 34);
    }

    ctx.restore();
}

export default function BalloonPopPage() {
    const { t, lang } = useLang();
    const canvasRef = useRef(null);
    const stateRef = useRef(null);
    const hudRef = useRef('');
    const [status, setStatus] = useState('idle');
    const [hud, setHud] = useState({ score: 0, lives: 3, popped: 0, streak: 0 });
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
        setHud({ score: 0, lives: 3, popped: 0, streak: 0 });
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

        const onPointerDown = (event) => {
            event.preventDefault();
            shoot(state, pointerPos(canvas, event, W, H));
        };

        canvas.addEventListener('pointerdown', onPointerDown);

        const loop = (now) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;

            update(state, dt);
            draw(ctx, state);

            const snapshot = `${state.score}|${state.lives}|${state.popped}|${state.streak}`;
            if (snapshot !== hudRef.current) {
                hudRef.current = snapshot;
                setHud({ score: state.score, lives: state.lives, popped: state.popped, streak: state.streak });
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
            canvas.removeEventListener('pointerdown', onPointerDown);
        };
    }, [status]);

    return (
        <GamePage
            game={GAME}
            stats={[
                { label: t('ניקוד', 'Score'), value: hud.score },
                {
                    label: t('חיים', 'Lives'),
                    value: '❤️'.repeat(Math.max(0, hud.lives)) || '—',
                    tone: hud.lives <= 1 ? 'bad' : 'good'
                },
                { label: t('פוצצת', 'Popped'), value: hud.popped },
                { label: t('רצף', 'Streak'), value: `x${hud.streak}`, tone: hud.streak > 4 ? 'good' : 'default' },
                { label: t('שיא', 'Best'), value: best }
            ]}
        >
            <GameStage canvasRef={canvasRef} width={W} height={H}>
                {status === 'idle' && (
                    <Overlay
                        emoji="🎈"
                        title={t('הבלונים עולים!', 'Here they come!')}
                        lines={[GAME[lang].description]}
                        actionLabel={t('התחל משחק', 'Start game')}
                        onAction={start}
                    />
                )}
                {status === 'over' && (
                    <Overlay
                        emoji={isRecord ? '🏆' : '🎈'}
                        title={isRecord ? t('שיא חדש!', 'New record!') : t('נגמרו החיים', 'Game over')}
                        lines={[
                            t(`ניקוד: ${hud.score}`, `Score: ${hud.score}`),
                            t(`בלונים שפוצצת: ${hud.popped}`, `Balloons popped: ${hud.popped}`)
                        ]}
                        actionLabel={t('שחק שוב', 'Play again')}
                        onAction={start}
                    />
                )}
            </GameStage>
        </GamePage>
    );
}
