export const metadata = {
    title: 'עיר הניאון',
    description: 'משחק נהיגה ויריות בעיר בלילה: נלחמים ברחפנים, אוספים מטבעות וקונים בחנות נשקים, מכוניות ודמויות.'
};

export default function GameLayout({ children }) {
    return (
        <div dir="rtl" lang="he" className="font-hebrew min-h-[100dvh] bg-slate-950 text-white">
            {children}
        </div>
    );
}
