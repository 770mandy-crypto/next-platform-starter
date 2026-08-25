'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getGame, highScoreKey } from 'components/games/catalog';
import { useLang } from 'components/games/language';
import { initAudio, sfx } from 'components/games/sound';
import { readHighScore, saveHighScore } from 'components/games/storage';
import { GamePage, GameStage, Overlay } from 'components/games/ui';
import { drawParticles, fitCanvas, pointerPos, rand, spawnBurst, updateParticles } from 'components/games/utils';

const COLS = 18;
const ROWS = 18;
const CELL = 22;
const W = COLS * CELL;
const H = ROWS * CELL;
const GAME = getGame('snake');
const HI_KEY = highScoreKey('snake');
const START_SPEED = 7.5;

function randomCell(exclude) {
    let cell;
    do {
        cell = { x: Math.floor(rand(0, COLS)), y: Math.floor(rand(0, ROWS)) };
    } while (exclude.some((s) => s.x === cell.x && s.y === cell.y));
    return cell;
}

function createState() {
    const snake = [
        { x: 8, y: 9 },
        { x: 7, y: 9 },
        { x: 6, y: 9 }
    ];
    return {
        snake,
        dir: { x: 1, y: 0 },
        nextDir: { x: 1, y: 0 },
        food: randomCell(snake),
        particles: [],
        moveTimer: 0,
        speed: START_SPEED,
        score: 0,
        shake: 0,
        over: false
    };
}

function setDirection(state, dx, dy) {
    if (dx === -state.dir.x && dy === -state.dir.y) return;
    state.nextDir = { x: dx, y: dy };
}

function update(state, dt) {
    updateParticles(state.particles, dt, 120);
    state.shake = Math.max(0, state.shake - dt);
    if (state.over) return;

    state.moveTimer += dt;
    const interval = 1 / state.speed;
    if (state.moveTimer < interval) return;
    state.moveTimer -= interval;

    state.dir = state.nextDir;
    const head = state.snake[0];
    const next = { x: head.x + state.dir.x, y: head.y + state.dir.y };

    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS || state.snake.some((s) => s.x === next.x && s.y === next.y)) {
        state.over = true;
        state.shake = 0.4;
        spawnBurst(state.particles, head.x * CELL + CELL / 2, head.y * CELL + CELL / 2, '#ef4444', 24, 200);
        sfx.gameOver();
        return;
    }

    state.snake.unshift(next);

    if (next.x === state.food.x && next.y === state.food.y) {
        state.score += 10;
        state.speed = Math.min(18, state.speed + 0.4);
        spawnBurst(state.particles, next.x * CELL + CELL / 2, next.y * CELL + CELL / 2, '#fbbf24', 14, 160);
        sfx.pop();
        state.food = randomCell(state.snake);
    } else {
        state.snake.pop();
    }
}

function drawCell(ctx, x, y, color, radius = 5) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x * CELL + 1.5, y * CELL + 1.5, CELL - 3, CELL - 3, radius);
    ctx.fill();
}

function draw(ctx, state) {
    ctx.save();
    if (state.shake > 0) ctx.translate(rand(-4, 4) * state.shake, rand(-4, 4) * state.shake);

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0f2e1a');
    sky.addColorStop(1, '#08160e');
    ctx.fillStyle = sky;
    ctx.fillRect(-10, -10, W + 20, H + 20);

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CELL, 0);
        ctx.lineTo(x * CELL, H);
        ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CELL);
        ctx.lineTo(W, y * CELL);
        ctx.stroke();
    }

    ctx.font = `${CELL - 4}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🍎', state.food.x * CELL + CELL / 2, state.food.y * CELL + CELL / 2 + 1);

    state.snake.forEach((seg, i) => {
        const color = i === 0 ? '#4ade80' : '#22c55e';
        drawCell(ctx, seg.x, seg.y, color, i === 0 ? 7 : 5);
    });

    drawParticles(ctx, state.particles);
    ctx.restore();
}

export default function SnakePage() {
    const { t, lang } = useLang();
    const canvasRef = useRef(null);
    const stateRef = useRef(null);
    const hudRef = useRef('');
    const [status, setStatus] = useState('idle');
    const [hud, setHud] = useState({ score: 0, length: 3 });
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
        setHud({ score: 0, length: 3 });
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
        let touchStart = null;

        const keyMap = {
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            w: [0, -1],
            W: [0, -1],
            s: [0, 1],
            S: [0, 1],
            a: [-1, 0],
            A: [-1, 0],
            d: [1, 0],
            D: [1, 0]
        };

        const onKeyDown = (event) => {
            if (event.key === 'Escape' || event.key === 'p' || event.key === 'P') {
                setStatus('paused');
                return;
            }
            const mapped = keyMap[event.key];
            if (mapped) {
                setDirection(state, mapped[0], mapped[1]);
                event.preventDefault();
            }
        };

        const onPointerDown = (event) => {
            touchStart = pointerPos(canvas, event, W, H);
        };

        const onPointerUp = (event) => {
            if (!touchStart) return;
            const end = pointerPos(canvas, event, W, H);
            const dx = end.x - touchStart.x;
            const dy = end.y - touchStart.y;
            if (Math.abs(dx) > Math.abs(dy)) {
                if (Math.abs(dx) > 12) setDirection(state, dx > 0 ? 1 : -1, 0);
            } else if (Math.abs(dy) > 12) {
                setDirection(state, 0, dy > 0 ? 1 : -1);
            }
            touchStart = null;
        };

        const onBlur = () => setStatus('paused');

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('blur', onBlur);
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointerup', onPointerUp);

        const loop = (now) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;

            update(state, dt);
            draw(ctx, state);

            const snapshot = `${state.score}|${state.snake.length}`;
            if (snapshot !== hudRef.current) {
                hudRef.current = snapshot;
                setHud({ score: state.score, length: state.snake.length });
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
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('blur', onBlur);
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointerup', onPointerUp);
        };
    }, [status]);

    return (
        <GamePage
            game={GAME}
            stats={[
                { label: t('ניקוד', 'Score'), value: hud.score },
                { label: t('אורך', 'Length'), value: hud.length },
                { label: t('שיא', 'Best'), value: best }
            ]}
        >
            <GameStage canvasRef={canvasRef} width={W} height={H}>
                {status === 'idle' && (
                    <Overlay
                        emoji="🐍"
                        title={t('מוכן לזחול?', 'Ready to slither?')}
                        lines={[GAME[lang].description]}
                        actionLabel={t('התחל משחק', 'Start game')}
                        onAction={start}
                    />
                )}
                {status === 'paused' && (
                    <Overlay
                        emoji="⏸️"
                        title={t('הפסקה', 'Paused')}
                        actionLabel={t('המשך', 'Resume')}
                        onAction={() => setStatus('running')}
                        secondaryLabel={t('משחק חדש', 'New game')}
                        onSecondary={start}
                    />
                )}
                {status === 'over' && (
                    <Overlay
                        emoji={isRecord ? '🏆' : '💥'}
                        title={isRecord ? t('שיא חדש!', 'New record!') : t('נגמר המשחק', 'Game over')}
                        lines={[t(`ניקוד: ${hud.score}`, `Score: ${hud.score}`), t(`אורך: ${hud.length}`, `Length: ${hud.length}`)]}
                        actionLabel={t('שחק שוב', 'Play again')}
                        onAction={start}
                    />
                )}
            </GameStage>
        </GamePage>
    );
}
