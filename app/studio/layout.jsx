export const metadata = {
    title: 'סטודיו AI',
    description:
        'סטודיו וידאו אחד שמחובר לכל כלי ה-AI: יצירת וידאו ותמונות, דיבוב לכל השפות, קריינות, מוזיקה ועריכה, מתוך צ׳אט אחד.'
};

export default function StudioLayout({ children }) {
    return (
        <div dir="rtl" lang="he" className="font-hebrew text-slate-100 bg-slate-950 min-h-[100dvh]">
            {children}
        </div>
    );
}
