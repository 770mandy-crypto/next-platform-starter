export const metadata = {
    title: { template: '%s | מכין התורים', default: 'מכין התורים' },
    description: 'אומרים לאיזה תור צריך, ומקבלים את הדרך הכי מהירה לקבוע אותו: קישור מדויק, טלפון, מה להכין, טיפים לתור מוקדם יותר, והוראה מוכנה ל-Claude in Chrome שיקבע אותו בשבילכם.'
};

export default function AppointmentsLayout({ children }) {
    return (
        <div dir="rtl" lang="he" className="font-hebrew min-h-[100dvh] bg-sky-50/40 text-slate-900">
            <header className="border-b border-sky-100 bg-white">
                <div className="mx-auto flex max-w-5xl items-center px-5 py-3">
                    <a href="/appointments" className="text-xl font-black text-slate-900 no-underline">
                        📅 מכין התורים
                    </a>
                </div>
            </header>
            {children}
        </div>
    );
}
