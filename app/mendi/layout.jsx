export const metadata = {
    title: 'MENDI AI · חדר הפיקוד',
    description:
        'צוות של 10 סוכני AI שעובדים בשבילך: מנהל ראשי שמחלק משימות, ישיבות Zoom, מצגות, מיילים, WhatsApp, מזכירות, מחקר, עסקים, שיווק, כספים ושירות לקוחות.'
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    themeColor: '#0b1020'
};

export default function MendiLayout({ children }) {
    return (
        <div dir="rtl" lang="he" className="font-hebrew text-slate-100 bg-[#0b1020] min-h-[100dvh]">
            {children}
        </div>
    );
}
