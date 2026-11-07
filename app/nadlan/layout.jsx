export const metadata = {
    title: { template: '%s | סוגרים', default: 'סוגרים – העוזר החכם למתווכי נדל"ן' },
    description: 'סוגרים מסדר לך את הלידים והנכסים מוואטסאפ, מתאים קונים לדירות ומזכיר מתי לחזור ללקוח. פחות בלגן, יותר עסקאות.'
};

export default function NadlanLayout({ children }) {
    return (
        <div dir="rtl" lang="he" className="font-hebrew flex min-h-[100dvh] flex-col bg-white text-slate-900">
            <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/90 backdrop-blur">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
                    <a href="/nadlan" className="text-xl font-black text-slate-900 no-underline">
                        🔑 סוגרים
                    </a>
                    <a
                        href="#waitlist"
                        className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white no-underline hover:bg-indigo-700"
                    >
                        הצטרפו לרשימת ההמתנה
                    </a>
                </div>
            </header>
            <div className="flex-1">{children}</div>
            <footer className="border-t border-slate-100 px-5 py-6 text-center text-sm text-slate-500">
                © {new Date().getFullYear()} סוגרים. כל הזכויות שמורות.
            </footer>
        </div>
    );
}
