'use client';

import { useState } from 'react';
import { EXERCISES, CATEGORIES, LEVELS, videoSearchUrl } from '../../data/workouts.js';

export function ExerciseLibrary() {
    const [category, setCategory] = useState('all');

    const filtered = category === 'all' ? EXERCISES : EXERCISES.filter((e) => e.category === category);

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-6">
                <FilterButton active={category === 'all'} onClick={() => setCategory('all')}>
                    הכל
                </FilterButton>
                {Object.values(CATEGORIES).map((cat) => (
                    <FilterButton key={cat.id} active={category === cat.id} onClick={() => setCategory(cat.id)}>
                        {cat.emoji} {cat.label}
                    </FilterButton>
                ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {filtered.map((ex) => (
                    <ExerciseCard key={ex.id} exercise={ex} />
                ))}
            </div>
        </div>
    );
}

function FilterButton({ active, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                'px-4 py-2 text-sm font-semibold transition rounded-full',
                active ? 'bg-primary text-primary-content' : 'bg-white/10 text-white hover:bg-white/20'
            ].join(' ')}
        >
            {children}
        </button>
    );
}

function ExerciseCard({ exercise }) {
    const [open, setOpen] = useState(false);
    const cat = CATEGORIES[exercise.category];
    const level = LEVELS[exercise.level];

    return (
        <div className="p-5 bg-white rounded-lg text-neutral-700">
            <div className="flex items-start justify-between gap-2">
                <h3 className="text-neutral-900">
                    {cat.emoji} {exercise.name}
                </h3>
                <span className="shrink-0 px-2 py-1 text-xs font-semibold rounded bg-neutral-100 text-neutral-600">
                    {level.label}
                </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
                {exercise.muscles.map((m) => (
                    <span key={m} className="px-2 py-0.5 text-xs rounded-full bg-secondary/10 text-secondary">
                        {m}
                    </span>
                ))}
            </div>

            {open && (
                <div className="mt-4 space-y-3">
                    <ol className="pr-4 space-y-1 text-sm list-decimal">
                        {exercise.steps.map((step, i) => (
                            <li key={i}>{step}</li>
                        ))}
                    </ol>
                    <p className="text-xs text-neutral-500">💡 {exercise.tips}</p>
                </div>
            )}

            <div className="flex gap-3 mt-4">
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    className="text-sm font-semibold text-secondary"
                >
                    {open ? 'הסתר הוראות' : 'הצג הוראות'}
                </button>
                <a
                    href={videoSearchUrl(exercise.youtubeQuery)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-secondary"
                >
                    ▶ הדגמת וידאו
                </a>
            </div>
        </div>
    );
}
