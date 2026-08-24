import { KeyBox } from 'components/bot/key-box';
import { SetupGuide } from 'components/bot/setup-guide';

export const metadata = {
    title: 'הגדרות נתונים — שוקי'
};

export default function SetupPage() {
    return (
        <div dir="rtl" className="flex flex-col gap-8">
            <header className="flex flex-col gap-3">
                <h1>🔑 הגדרת מקורות נתונים</h1>
                <p className="max-w-2xl text-lg opacity-80">
                    הדף הזה בודק בזמן אמת אם המפתחות הגיעו לשרת ועובדים. הוא מבחין בין מפתח שלא הגיע, מפתח שנדחה,
                    ומכסה שנגמרה — שלושה מצבים שדורשים תיקון שונה לגמרי.
                </p>
                <p className="max-w-2xl text-sm opacity-70">
                    מקורות הנתונים החינמיים חוסמים שרתי ענן, ולכן פריסה בענן מחייבת מפתח. בהרצה מקומית לרוב אין בזה
                    צורך.
                </p>
            </header>

            <KeyBox />

            <SetupGuide />
        </div>
    );
}
