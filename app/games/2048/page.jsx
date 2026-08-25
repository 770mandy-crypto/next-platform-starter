'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getGame, highScoreKey } from 'components/games/catalog';
import { useLang } from 'components/games/language';
import { initAudio, sfx } from 'components/games/sound';
import { readHighScore, saveHighScore } from 'components/games/storage';
import { GamePage, Overlay } from 'components/games/ui';

const SIZE = 4;
const GAME = getGame('2048');
const HI_KEY = highScoreKey('2048');

const TILE_STYLES = {
    2: 'bg-amber-100 text-amber-900',
    4: 'bg-amber-200 text-amber-900',
    8: 'bg-orange-300 text-white',
    16: 'bg-orange-400 text-white',
    32: 'bg-orange-500 text-white',
    64: 'bg-red-500 text-white',
    128: 'bg-yellow-400 text-white text-2xl',
    256: 'bg-yellow-500 text-white text-2xl',
    512: 'bg-yellow-600 text-white text-2xl',
    1024: 'bg-indigo-500 text-white text-xl',
    2048: 'bg-fuchsia-600 text-white text-xl'
};

function emptyBoard() {
    return Array(SIZE * SIZE).fill(0);
}

function emptyCells(board) {
    return board.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
}

function addRandomTile(board) {
    const empty = emptyCells(board);
    if (empty.length === 0) return board;
    const idx = empty[Math.floor(Math.random() * empty.length)];
    const next = board.slice();
    next[idx] = Math.random() < 0.9 ? 2 : 4;
    return next;
}

function slideRowLeft(row) {
    const nums = row.filter((v) => v !== 0);
    const merged = [];
    let gain = 0;
    for (let i = 0; i < nums.length; i++) {
        if (nums[i] === nums[i + 1]) {
            const value = nums[i] * 2;
            merged.push(value);
            gain += value;
            i++;
        } else {
            merged.push(nums[i]);
        }
    }
    while (merged.length < SIZE) merged.push(0);
    return { row: merged, gain };
}

function getRow(board, r) {
    return [board[r * SIZE], board[r * SIZE + 1], board[r * SIZE + 2], board[r * SIZE + 3]];
}
function getCol(board, c) {
    return [board[c], board[SIZE + c], board[2 * SIZE + c], board[3 * SIZE + c]];
}

function move(board, direction) {
    const next = board.slice();
    let gain = 0;
    let changed = false;

    for (let i = 0; i < SIZE; i++) {
        let line = direction === 'left' || direction === 'right' ? getRow(board, i) : getCol(board, i);
        const reversed = direction === 'right' || direction === 'down';
        if (reversed) line = line.slice().reverse();

        const result = slideRowLeft(line);
        gain += result.gain;
        let finalLine = result.row;
        if (reversed) finalLine = finalLine.slice().reverse();

        for (let j = 0; j < SIZE; j++) {
            const idx = direction === 'left' || direction === 'right' ? i * SIZE + j : j * SIZE + i;
            if (next[idx] !== finalLine[j]) changed = true;
            next[idx] = finalLine[j];
        }
    }

    return { board: next, gain, changed };
}

function canMove(board) {
    if (emptyCells(board).length > 0) return true;
    for (let r = 0; r < SIZE; r++) {
        const row = getRow(board, r);
        for (let c = 0; c < SIZE - 1; c++) if (row[c] === row[c + 1]) return true;
    }
    for (let c = 0; c < SIZE; c++) {
        const col = getCol(board, c);
        for (let r = 0; r < SIZE - 1; r++) if (col[r] === col[r + 1]) return true;
    }
    return false;
}

function createInitialBoard() {
    return addRandomTile(addRandomTile(emptyBoard()));
}

export default function Game2048Page() {
    const { t, lang } = useLang();
    const [status, setStatus] = useState('idle');
    const [board, setBoard] = useState(() => emptyBoard());
    const [score, setScore] = useState(0);
    const [best, setBest] = useState(0);
    const [isRecord, setIsRecord] = useState(false);
    const [wonOnce, setWonOnce] = useState(false);
    const touchStart = useRef(null);

    useEffect(() => {
        setBest(readHighScore(HI_KEY));
    }, []);

    const start = useCallback(() => {
        initAudio();
        setBoard(createInitialBoard());
        setScore(0);
        setIsRecord(false);
        setWonOnce(false);
        setStatus('running');
    }, []);

    const applyMove = useCallback(
        (direction) => {
            if (status !== 'running') return;
            setBoard((prevBoard) => {
                const result = move(prevBoard, direction);
                if (!result.changed) return prevBoard;

                sfx.shoot();
                const nextBoard = addRandomTile(result.board);

                setScore((prevScore) => {
                    const nextScore = prevScore + result.gain;
                    if (saveHighScore(HI_KEY, nextScore)) {
                        setIsRecord(true);
                        setBest(nextScore);
                    }
                    return nextScore;
                });

                if (!wonOnce && nextBoard.includes(2048)) {
                    setWonOnce(true);
                    sfx.levelUp();
                    setStatus('won');
                } else if (!canMove(nextBoard)) {
                    sfx.gameOver();
                    setStatus('over');
                }

                return nextBoard;
            });
        },
        [status, wonOnce]
    );

    useEffect(() => {
        if (status !== 'running') return;

        const keyMap = {
            ArrowLeft: 'left',
            ArrowRight: 'right',
            ArrowUp: 'up',
            ArrowDown: 'down',
            a: 'left',
            A: 'left',
            d: 'right',
            D: 'right',
            w: 'up',
            W: 'up',
            s: 'down',
            S: 'down'
        };

        const onKeyDown = (event) => {
            const mapped = keyMap[event.key];
            if (mapped) {
                event.preventDefault();
                applyMove(mapped);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [status, applyMove]);

    const onPointerDown = (event) => {
        touchStart.current = { x: event.clientX, y: event.clientY };
    };
    const onPointerUp = (event) => {
        if (!touchStart.current) return;
        const dx = event.clientX - touchStart.current.x;
        const dy = event.clientY - touchStart.current.y;
        touchStart.current = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        if (Math.abs(dx) > Math.abs(dy)) applyMove(dx > 0 ? 'right' : 'left');
        else applyMove(dy > 0 ? 'down' : 'up');
    };

    return (
        <GamePage
            game={GAME}
            stats={[
                { label: t('ניקוד', 'Score'), value: score },
                { label: t('שיא', 'Best'), value: best }
            ]}
        >
            <div
                className="relative w-full mx-auto overflow-hidden shadow-2xl rounded-3xl ring-2 ring-white/15 bg-slate-950"
                style={{ maxWidth: '420px', aspectRatio: '1 / 1' }}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
            >
                <div className="grid w-full h-full grid-cols-4 grid-rows-4 gap-2 p-3 touch-none select-none bg-gradient-to-br from-orange-900/40 to-amber-950/40">
                    {board.map((value, i) => (
                        <div
                            key={i}
                            className={[
                                'flex items-center justify-center rounded-xl font-black text-3xl transition-transform',
                                value ? (TILE_STYLES[value] ?? 'bg-slate-900 text-white text-lg') : 'bg-white/5'
                            ].join(' ')}
                        >
                            {value || ''}
                        </div>
                    ))}
                </div>

                {status === 'idle' && (
                    <Overlay
                        emoji="🔢"
                        title={t('מוכן למזג?', 'Ready to merge?')}
                        lines={[GAME[lang].description]}
                        actionLabel={t('התחל משחק', 'Start game')}
                        onAction={start}
                    />
                )}
                {status === 'won' && (
                    <Overlay
                        emoji="🏆"
                        title={t('הגעת ל־2048!', 'You reached 2048!')}
                        lines={[t(`ניקוד: ${score}`, `Score: ${score}`)]}
                        actionLabel={t('המשך לשחק', 'Keep playing')}
                        onAction={() => setStatus('running')}
                        secondaryLabel={t('משחק חדש', 'New game')}
                        onSecondary={start}
                    />
                )}
                {status === 'over' && (
                    <Overlay
                        emoji={isRecord ? '🏆' : '💥'}
                        title={isRecord ? t('שיא חדש!', 'New record!') : t('אין עוד מהלכים', 'No more moves')}
                        lines={[t(`ניקוד: ${score}`, `Score: ${score}`)]}
                        actionLabel={t('שחק שוב', 'Play again')}
                        onAction={start}
                    />
                )}
            </div>
        </GamePage>
    );
}
