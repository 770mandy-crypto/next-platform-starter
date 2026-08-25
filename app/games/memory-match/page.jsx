'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getGame, highScoreKey } from 'components/games/catalog';
import { useLang } from 'components/games/language';
import { initAudio, sfx } from 'components/games/sound';
import { readHighScore, saveHighScore } from 'components/games/storage';
import { GamePage, Overlay } from 'components/games/ui';

const EMOJIS = ['🐱', '🐶', '🐵', '🦊', '🐸', '🐼', '🐨', '🦁'];
const GAME = getGame('memory-match');
const HI_KEY = highScoreKey('memory-match');
const FLIP_BACK_DELAY = 750;

function shuffledDeck() {
    const deck = [...EMOJIS, ...EMOJIS].map((emoji, i) => ({ id: i, emoji, matched: false }));
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function computeScore(moves, seconds) {
    return Math.max(0, 1000 - moves * 12 - seconds * 4);
}

export default function MemoryMatchPage() {
    const { t, lang } = useLang();
    const [status, setStatus] = useState('idle');
    const [deck, setDeck] = useState([]);
    const [flipped, setFlipped] = useState([]);
    const [moves, setMoves] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [best, setBest] = useState(0);
    const [isRecord, setIsRecord] = useState(false);
    const busyRef = useRef(false);

    useEffect(() => {
        setBest(readHighScore(HI_KEY));
    }, []);

    useEffect(() => {
        if (status !== 'running') return;
        const id = setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, [status]);

    const start = useCallback(() => {
        initAudio();
        setDeck(shuffledDeck());
        setFlipped([]);
        setMoves(0);
        setSeconds(0);
        setIsRecord(false);
        busyRef.current = false;
        setStatus('running');
    }, []);

    const onFlip = (index) => {
        if (status !== 'running' || busyRef.current) return;
        if (flipped.includes(index) || deck[index].matched) return;

        const nextFlipped = [...flipped, index];
        setFlipped(nextFlipped);

        if (nextFlipped.length < 2) return;

        busyRef.current = true;
        setMoves((m) => m + 1);
        const [a, b] = nextFlipped;

        if (deck[a].emoji === deck[b].emoji) {
            sfx.pop();
            setTimeout(() => {
                setDeck((prev) => prev.map((card, i) => (i === a || i === b ? { ...card, matched: true } : card)));
                setFlipped([]);
                busyRef.current = false;
            }, 180);
        } else {
            sfx.miss();
            setTimeout(() => {
                setFlipped([]);
                busyRef.current = false;
            }, FLIP_BACK_DELAY);
        }
    };

    useEffect(() => {
        if (status !== 'running' || deck.length === 0) return;
        if (deck.every((card) => card.matched)) {
            const score = computeScore(moves, seconds);
            const record = saveHighScore(HI_KEY, score);
            setIsRecord(record);
            if (record) setBest(score);
            sfx.levelUp();
            setStatus('over');
        }
    }, [deck, moves, seconds, status]);

    const finalScore = computeScore(moves, seconds);

    return (
        <GamePage
            game={GAME}
            stats={[
                { label: t('מהלכים', 'Moves'), value: moves },
                { label: t('זמן', 'Time'), value: `${seconds}s` },
                { label: t('שיא', 'Best'), value: best }
            ]}
        >
            <div
                className="relative w-full mx-auto overflow-hidden shadow-2xl rounded-3xl ring-2 ring-white/15 bg-slate-950"
                style={{ maxWidth: '440px', aspectRatio: '1 / 1' }}
            >
                <div className="grid w-full h-full grid-cols-4 grid-rows-4 gap-2 p-3 bg-gradient-to-br from-purple-900/40 to-fuchsia-950/40">
                    {(deck.length ? deck : Array(16).fill(null)).map((card, i) => {
                        const isUp = card && (card.matched || flipped.includes(i));
                        return (
                            <button
                                key={card ? card.id : i}
                                type="button"
                                onClick={() => onFlip(i)}
                                disabled={!card || status !== 'running'}
                                className={[
                                    'flex items-center justify-center rounded-xl text-3xl font-black transition-all duration-200 cursor-pointer',
                                    isUp
                                        ? card.matched
                                            ? 'bg-emerald-400/80 scale-95'
                                            : 'bg-white'
                                        : 'bg-gradient-to-br from-purple-500 to-fuchsia-600 hover:brightness-110'
                                ].join(' ')}
                            >
                                {isUp ? card.emoji : ''}
                            </button>
                        );
                    })}
                </div>

                {status === 'idle' && (
                    <Overlay
                        emoji="🃏"
                        title={t('מוכן לזכור?', 'Ready to remember?')}
                        lines={[GAME[lang].description]}
                        actionLabel={t('התחל משחק', 'Start game')}
                        onAction={start}
                    />
                )}
                {status === 'over' && (
                    <Overlay
                        emoji={isRecord ? '🏆' : '🎉'}
                        title={isRecord ? t('שיא חדש!', 'New record!') : t('כל הכבוד!', 'Well done!')}
                        lines={[
                            t(`מהלכים: ${moves}`, `Moves: ${moves}`),
                            t(`זמן: ${seconds} שניות`, `Time: ${seconds}s`),
                            t(`ניקוד: ${finalScore}`, `Score: ${finalScore}`)
                        ]}
                        actionLabel={t('שחק שוב', 'Play again')}
                        onAction={start}
                    />
                )}
            </div>
        </GamePage>
    );
}
