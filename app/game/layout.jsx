export const metadata = {
    title: 'סערת הקרב — משחק Battle Royale',
    description: 'משחק יריות Battle Royale בתלת-ממד: קופצים מספינת אוויר, אוספים נשקים, בונים, ושורדים את הסערה. 7 עולמות ו-8 דמויות לפתוח.'
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false
};

export default function GameLayout({ children }) {
    return (
        <div dir="rtl" lang="he" className="font-hebrew">
            {children}
        </div>
    );
}
