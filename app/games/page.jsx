'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { GAMES, highScoreKey } from 'components/games/catalog';
import { useLang } from 'components/games/language';
import { readHighScore } from 'components/games/storage';
import { LanguageToggle, SoundToggle } from 'components/games/ui';

export default function GamesHubPage() {
    const { lang, t } = useLang();
    const [scores, setScores] = useState({});

    useEffect(() => {
        setScores(Object.fromEntries(GAMES.map((game) => [game.slug, readHighScore(highScoreKey(game.slug))])));
    }, []);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black sm:text-4xl">
                    <span aria-hidden="true" className="me-2">
                        🕹️
                    </span>
                    {t('הארקייד שלי', 'My Arcade')}
                </h1>
                <div className="flex items-center gap-2 ms-auto">
                    <SoundToggle />
                    <LanguageToggle />
                </div>
            </div>

            <p className="max-w-2xl text-lg text-white/80">
                {t(
                    'שלושה משחקי ירי, שיאים אישיים שנשמרים במכשיר שלך, וממשק בעברית ובאנגלית. בחר משחק והתחל לירות.',
                    'Three shooting games, personal high scores saved on your device, and an interface in Hebrew and English. Pick a game and start shooting.'
                )}
            </p>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {GAMES.map((game) => {
                    const copy = game[lang];
                    const best = scores[game.slug] ?? 0;

                    return (
                        <Link
                            key={game.slug}
                            href={`/games/${game.slug}`}
                            className={`group flex flex-col gap-3 p-6 no-underline transition rounded-3xl bg-gradient-to-br ${game.gradient} shadow-xl ${game.glow} ring-1 ring-white/20 hover:-translate-y-1 hover:shadow-2xl`}
                        >
                            <span aria-hidden="true" className="text-5xl transition group-hover:scale-110">
                                {game.emoji}
                            </span>
                            <span className="text-2xl font-black">{copy.title}</span>
                            <span className="text-sm font-bold uppercase tracking-wider text-white/70">
                                {copy.tagline}
                            </span>
                            <span className="text-white/90">{copy.description}</span>
                            <span className="mt-auto pt-3 text-sm font-bold border-t border-white/20">
                                {best > 0
                                    ? t(`השיא שלך: ${best}`, `Your best: ${best}`)
                                    : t('עוד אין שיא — קדימה!', 'No score yet — go for it!')}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
