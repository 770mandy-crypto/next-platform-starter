export const metadata = {
    title: { template: '%s | כותב המכתבים', default: 'כותב המכתבים הרשמיים' },
    description: 'מתארים מה קרה, ומקבלים מכתב רשמי מוכן: ערעור על דוח, תלונה לחברת ביטוח, פנייה לביטוח לאומי ועוד. בדיקת זכויות ברשת, מכתב לעריכה, והורדה כ-PDF או Word.'
};

export default function LettersLayout({ children }) {
    return (
        <div dir="rtl" lang="he" className="font-hebrew min-h-[100dvh] bg-stone-50 text-slate-900">
            <header className="border-b border-stone-200 bg-white print:hidden">
                <div className="mx-auto flex max-w-6xl items-center px-5 py-3">
                    <a href="/letters" className="text-xl font-black text-slate-900 no-underline">
                        ✉️ כותב המכתבים
                    </a>
                </div>
            </header>
            {children}
        </div>
    );
}
