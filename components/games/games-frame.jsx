'use client';

import { useLang } from './language';

export function GamesFrame({ children }) {
    const { dir } = useLang();

    return (
        <div dir={dir} className="font-games">
            <div className="p-5 sm:p-8 rounded-[2rem] bg-gradient-to-br from-purple-700 via-fuchsia-700 to-indigo-800 ring-1 ring-white/15 shadow-2xl">
                {children}
            </div>
        </div>
    );
}
