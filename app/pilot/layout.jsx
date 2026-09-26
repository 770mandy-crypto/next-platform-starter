export const metadata = {
    title: 'מסלול — Maslul AI',
    description: 'AI שמוביל ממטרה, לתוכנית, לביצוע ולתוצאה — עם אישור לפני כל פעולה חיצונית.'
};

export default function PilotLayout({ children }) {
    return (
        <div dir="rtl" lang="he" className="font-hebrew text-slate-900 bg-white">
            {children}
        </div>
    );
}
