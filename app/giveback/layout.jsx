import { SessionProvider } from 'components/giveback/session';
import { SubNav } from 'components/giveback/subnav';

export const metadata = {
    title: {
        template: '%s | GiveBack',
        default: 'GiveBack — מוסרים לשכנים'
    },
    description: 'מסירת חפצים שכבר לא צריך לשכנים בסביבה: חיפוש לפי מרחק, צ׳אט, וניווט לאיסוף ב-Waze.'
};

export default function GiveBackLayout({ children }) {
    return (
        <SessionProvider>
            <div dir="rtl" lang="he" className="pb-16 [&_.input]:bg-white">
                <SubNav />
                {children}
            </div>
        </SessionProvider>
    );
}
