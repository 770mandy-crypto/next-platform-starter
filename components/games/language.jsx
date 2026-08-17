'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'games:lang';
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
    const [lang, setLangState] = useState('he');

    useEffect(() => {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved === 'he' || saved === 'en') setLangState(saved);
    }, []);

    const setLang = useCallback((next) => {
        setLangState(next);
        window.localStorage.setItem(STORAGE_KEY, next);
    }, []);

    const value = useMemo(
        () => ({
            lang,
            setLang,
            dir: lang === 'he' ? 'rtl' : 'ltr',
            /** Picks the string matching the active language. */
            t: (he, en) => (lang === 'he' ? he : en)
        }),
        [lang, setLang]
    );

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
    const context = useContext(LanguageContext);
    if (!context) throw new Error('useLang must be used inside <LanguageProvider>');
    return context;
}
