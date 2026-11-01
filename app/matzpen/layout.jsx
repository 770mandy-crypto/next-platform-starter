export const metadata = {
    title: { template: '%s | מצפן נדל״ן', default: 'מצפן נדל״ן – איפה כדאי לקנות דירה בישראל' },
    description: 'מפת שכונות לכל הארץ עם ציון צמיחה לכל שכונה, וסוכן AI שממליץ לך איפה לקנות לפי התקציב והמטרה שלך.'
};

export default function MatzpenLayout({ children }) {
    return (
        <div dir="rtl" lang="he" className="font-hebrew flex min-h-[100dvh] flex-col bg-slate-50 text-slate-900">
            <header className="sticky top-0 z-[1000] border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
                    <a href="/matzpen" className="text-xl font-black text-slate-900 no-underline">
                        🧭 מצפן נדל״ן
                    </a>
                    <span className="hidden text-sm text-slate-500 sm:block">איפה כדאי לקנות דירה בישראל</span>
                </div>
            </header>
            <div className="flex-1">{children}</div>
        </div>
    );
}
