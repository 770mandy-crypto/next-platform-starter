'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getGame, highScoreKey } from 'components/games/catalog';
import { useLang } from 'components/games/language';
import { initAudio, sfx } from 'components/games/sound';
import { readHighScore, saveHighScore } from 'components/games/storage';
import { GamePage, GameStage, Overlay } from 'components/games/ui';
import {
    circlesHit,
    clamp,
    drawParticles,
    fitCanvas,
    pick,
    pointerPos,
    rand,
    spawnBurst,
    updateParticles
} from 'components/games/utils';

const W = 420;
const H = 620;
const GAME = getGame('space-shooter');
const HI_KEY = highScoreKey('space-shooter');

const ENEMY_COLORS = ['#ff5d8f', '#ffd23f', '#4cc9f0', '#7bf1a8', '#b388ff'];
const KILLS_PER_LEVEL = 8;

function createState() {
    return {
        player: { x: W / 2, y: H - 54, r: 15, cooldown: 0, invulnerable: 1.5 },
        bullets: [],
        enemyBullets: [],
        enemies: [],
        particles: [],
        stars: Array.from({ length: 70 }, () => ({
            x: rand(0, W),
            y: rand(0, H),
            r: rand(0.5, 1.9),
            speed: rand(20, 90)
        })),
        keys: new Set(),
        pointerX: null,
        firing: false,
        spawnTimer: 0.8,
        score: 0,
        lives: 3,
        level: 1,
        kills: 0,
        shake: 0,
        over: false
    };
}

function spawnEnemy(state) {
    const roll = Math.random();
    const level = state.level;
    let type = 'grunt';
    if (level >= 3 && roll > 0.78) type = 'tank';
    else if (level >= 2 && roll > 0.5) type = 'shooter';

    const base = {
        grunt: { r: 15, hp: 1, speed: 70, points: 10 },
        shooter: { r: 17, hp: 2, speed: 55, points: 25 },
        tank: { r: 23, hp: 4, speed: 40, points: 50 }
    }[type];

    state.enemies.push({
        type,
        x: rand(30, W - 30),
        y: -30,
        r: base.r,
        hp: base.hp,
        points: base.points,
        speed: base.speed + level * 6,
        color: pick(ENEMY_COLORS),
        wobble: rand(0.6, 1.6),
        phase: rand(0, Math.PI * 2),
        shootTimer: rand(1, 2.5),
        flash: 0
    });
}

function damageEnemy(state, enemy, index) {
    enemy.hp -= 1;
    enemy.flash = 0.12;
    if (enemy.hp > 0) {
        sfx.hit();
        spawnBurst(state.particles, enemy.x, enemy.y, enemy.color, 5, 120);
        return;
    }

    sfx.explode();
    spawnBurst(state.particles, enemy.x, enemy.y, enemy.color, 18, 220);
    state.enemies.splice(index, 1);
    state.score += enemy.points;
    state.kills += 1;

    if (state.kills % KILLS_PER_LEVEL === 0) {
        state.level += 1;
        sfx.levelUp();
    }
}

function hurtPlayer(state) {
    if (state.player.invulnerable > 0) return;
    state.lives -= 1;
    state.player.invulnerable = 2;
    state.shake = 0.45;
    spawnBurst(state.particles, state.player.x, state.player.y, '#ffffff', 24, 260);
    state.enemyBullets.length = 0;
    if (state.lives <= 0) {
        state.over = true;
        sfx.gameOver();
    } else {
        sfx.explode();
    }
}

function update(state, dt) {
    const { player } = state;

    for (const star of state.stars) {
        star.y += star.speed * dt;
        if (star.y > H) {
            star.y = -2;
            star.x = rand(0, W);
        }
    }

    let direction = 0;
    if (state.keys.has('left')) direction -= 1;
    if (state.keys.has('right')) direction += 1;

    if (direction !== 0) {
        state.pointerX = null;
        player.x += direction * 300 * dt;
    } else if (state.pointerX !== null) {
        player.x += (state.pointerX - player.x) * Math.min(1, dt * 14);
    }
    player.x = clamp(player.x, 20, W - 20);

    player.cooldown -= dt;
    player.invulnerable -= dt;
    if (state.firing && player.cooldown <= 0) {
        state.bullets.push({ x: player.x, y: player.y - 20, r: 4 });
        player.cooldown = 0.16;
        sfx.shoot();
    }

    for (let i = state.bullets.length - 1; i >= 0; i--) {
        const bullet = state.bullets[i];
        bullet.y -= 620 * dt;
        if (bullet.y < -10) state.bullets.splice(i, 1);
    }

    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
        const bullet = state.enemyBullets[i];
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
        if (bullet.y > H + 10 || bullet.x < -10 || bullet.x > W + 10) state.enemyBullets.splice(i, 1);
    }

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
        spawnEnemy(state);
        state.spawnTimer = Math.max(0.32, 1.3 - state.level * 0.09);
    }

    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i];
        enemy.phase += dt * enemy.wobble * 3;
        enemy.x += Math.cos(enemy.phase) * 40 * dt;
        enemy.y += enemy.speed * dt;
        enemy.x = clamp(enemy.x, enemy.r, W - enemy.r);
        enemy.flash -= dt;

        if (enemy.type !== 'grunt') {
            enemy.shootTimer -= dt;
            if (enemy.shootTimer <= 0 && enemy.y > 40 && enemy.y < H - 140) {
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const length = Math.hypot(dx, dy) || 1;
                const speed = 190 + state.level * 8;
                state.enemyBullets.push({
                    x: enemy.x,
                    y: enemy.y + enemy.r,
                    r: 5,
                    vx: (dx / length) * speed,
                    vy: (dy / length) * speed,
                    color: enemy.color
                });
                enemy.shootTimer = rand(1.4, 3);
            }
        }

        if (enemy.y - enemy.r > H) {
            state.enemies.splice(i, 1);
            hurtPlayer(state);
            continue;
        }

        if (circlesHit(enemy, player)) {
            spawnBurst(state.particles, enemy.x, enemy.y, enemy.color, 16, 200);
            state.enemies.splice(i, 1);
            hurtPlayer(state);
            continue;
        }

        for (let b = state.bullets.length - 1; b >= 0; b--) {
            if (circlesHit(enemy, state.bullets[b])) {
                state.bullets.splice(b, 1);
                damageEnemy(state, enemy, i);
                break;
            }
        }
    }

    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
        if (circlesHit(state.enemyBullets[i], player)) {
            state.enemyBullets.splice(i, 1);
            hurtPlayer(state);
        }
    }

    updateParticles(state.particles, dt, 60);
    state.shake = Math.max(0, state.shake - dt);
}

function drawShip(ctx, player, blink) {
    ctx.save();
    ctx.translate(player.x, player.y);
    if (blink) ctx.globalAlpha = 0.4;

    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(6, 6);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#4cc9f0';
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(16, 14);
    ctx.lineTo(6, 10);
    ctx.lineTo(0, 16);
    ctx.lineTo(-6, 10);
    ctx.lineTo(-16, 14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ff5d8f';
    ctx.beginPath();
    ctx.arc(0, -2, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 210, 63, 0.85)';
    const flame = 6 + Math.random() * 8;
    ctx.beginPath();
    ctx.moveTo(-5, 14);
    ctx.lineTo(5, 14);
    ctx.lineTo(0, 14 + flame);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

function drawEnemy(ctx, enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    ctx.fillStyle = enemy.flash > 0 ? '#ffffff' : enemy.color;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.r, Math.PI, 0);
    ctx.lineTo(enemy.r, enemy.r * 0.5);
    for (let i = 0; i < 4; i++) {
        const step = (enemy.r * 2) / 4;
        ctx.lineTo(enemy.r - step * i - step / 2, enemy.r * 0.5 + (i % 2 ? 6 : -6));
    }
    ctx.lineTo(-enemy.r, enemy.r * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-enemy.r * 0.32, -enemy.r * 0.12, enemy.r * 0.22, 0, Math.PI * 2);
    ctx.arc(enemy.r * 0.32, -enemy.r * 0.12, enemy.r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-enemy.r * 0.26, -enemy.r * 0.2, enemy.r * 0.08, 0, Math.PI * 2);
    ctx.arc(enemy.r * 0.38, -enemy.r * 0.2, enemy.r * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function draw(ctx, state) {
    ctx.save();
    if (state.shake > 0) {
        ctx.translate(rand(-6, 6) * state.shake, rand(-6, 6) * state.shake);
    }

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1b0b3a');
    sky.addColorStop(0.55, '#2d1163');
    sky.addColorStop(1, '#0b1030');
    ctx.fillStyle = sky;
    ctx.fillRect(-20, -20, W + 40, H + 40);

    ctx.fillStyle = '#ffffff';
    for (const star of state.stars) {
        ctx.globalAlpha = 0.25 + star.r / 3;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const enemy of state.enemies) drawEnemy(ctx, enemy);

    ctx.fillStyle = '#7bf1a8';
    for (const bullet of state.bullets) {
        ctx.beginPath();
        ctx.roundRect(bullet.x - 2.5, bullet.y - 9, 5, 18, 3);
        ctx.fill();
    }

    for (const bullet of state.enemyBullets) {
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
        ctx.fill();
    }

    drawParticles(ctx, state.particles);
    drawShip(ctx, state.player, state.player.invulnerable > 0 && Math.floor(state.player.invulnerable * 12) % 2 === 0);

    ctx.restore();
}

export default function SpaceShooterPage() {
    const { t, lang } = useLang();
    const canvasRef = useRef(null);
    const stateRef = useRef(null);
    const hudRef = useRef('');
    const [status, setStatus] = useState('idle');
    const [hud, setHud] = useState({ score: 0, lives: 3, level: 1 });
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
        setHud({ score: 0, lives: 3, level: 1 });
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

        const keyMap = {
            ArrowLeft: 'left',
            ArrowRight: 'right',
            a: 'left',
            A: 'left',
            d: 'right',
            D: 'right'
        };

        const onKeyDown = (event) => {
            if (event.key === 'Escape' || event.key === 'p' || event.key === 'P') {
                setStatus('paused');
                return;
            }
            const mapped = keyMap[event.key];
            if (mapped) {
                state.keys.add(mapped);
                event.preventDefault();
            }
            if (event.key === ' ') {
                state.firing = true;
                event.preventDefault();
            }
        };

        const onKeyUp = (event) => {
            const mapped = keyMap[event.key];
            if (mapped) state.keys.delete(mapped);
            if (event.key === ' ') state.firing = false;
        };

        const onPointerDown = (event) => {
            canvas.setPointerCapture?.(event.pointerId);
            state.pointerX = pointerPos(canvas, event, W, H).x;
            state.firing = true;
        };

        const onPointerMove = (event) => {
            if (!state.firing) return;
            state.pointerX = pointerPos(canvas, event, W, H).x;
        };

        const onPointerUp = () => {
            state.firing = false;
        };

        const onBlur = () => setStatus('paused');

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', onBlur);
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);

        const loop = (now) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;

            update(state, dt);
            draw(ctx, state);

            const snapshot = `${state.score}|${state.lives}|${state.level}`;
            if (snapshot !== hudRef.current) {
                hudRef.current = snapshot;
                setHud({ score: state.score, lives: state.lives, level: state.level });
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
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('pointercancel', onPointerUp);
            state.keys.clear();
            state.firing = false;
        };
    }, [status]);

    return (
        <GamePage
            game={GAME}
            stats={[
                { label: t('ניקוד', 'Score'), value: hud.score },
                { label: t('חיים', 'Lives'), value: '❤️'.repeat(Math.max(0, hud.lives)) || '—', tone: hud.lives <= 1 ? 'bad' : 'good' },
                { label: t('שלב', 'Level'), value: hud.level },
                { label: t('שיא', 'Best'), value: best }
            ]}
        >
            <GameStage canvasRef={canvasRef} width={W} height={H}>
                {status === 'idle' && (
                    <Overlay
                        emoji="🚀"
                        title={t('מוכן להמריא?', 'Ready for takeoff?')}
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
                        title={isRecord ? t('שיא חדש!', 'New record!') : t('נפלת', 'Game over')}
                        lines={[
                            t(`ניקוד: ${hud.score}`, `Score: ${hud.score}`),
                            t(`הגעת לשלב ${hud.level}`, `You reached level ${hud.level}`)
                        ]}
                        actionLabel={t('שחק שוב', 'Play again')}
                        onAction={start}
                    />
                )}
            </GameStage>
        </GamePage>
    );
}
