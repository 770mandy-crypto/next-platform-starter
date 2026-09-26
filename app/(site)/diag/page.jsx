import { DiagRunner } from 'components/bot/diag-runner';

export const metadata = {
    title: 'אבחון חיבור — שוקי'
};

export default function DiagPage() {
    return (
        <div dir="rtl" className="flex flex-col gap-6">
            <header className="flex flex-col gap-3">
                <h1>🔧 אבחון החיבור ל-Yahoo</h1>
                <p className="max-w-2xl opacity-80">
                    הדף הזה בודק כל שלב בשליפת הנתונים בנפרד ומראה מה בדיוק חזר מהשרת. הוא קיים כדי לאתר תקלה שמופיעה
                    רק בסביבה הפרוסה. לחץ על &quot;העתק דוח&quot; ושלח לי את התוצאה.
                </p>
            </header>

            <DiagRunner />
        </div>
    );
}
