export const metadata = {
    title: 'צ׳אט עם הסוכנים',
    description: 'שיחה עם צוות סוכני ה-AI המתמחים: אבטחה, באגים, מחקר, ניתוח, סקירת קוד, טסטים ותיעוד.'
};

export default function AgentsLayout({ children }) {
    return (
        <div dir="rtl" lang="he" className="font-hebrew text-slate-900 bg-slate-50">
            {children}
        </div>
    );
}
