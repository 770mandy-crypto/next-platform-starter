import Link from 'next/link';
import { ChartUpload } from 'components/bot/chart-upload';

export const metadata = {
    title: 'ניתוח מצילום מסך — שוקי'
};

export default function UploadPage() {
    return (
        <div dir="rtl" className="flex flex-col gap-8">
            <header className="flex flex-col gap-3">
                <h1>📸 ניתוח מצילום מסך</h1>
                <p className="max-w-2xl text-lg opacity-80">
                    העלה צילום מסך מאפליקציית מסחר או תמונה של גרף. שוקי יקרא את הגרף שבתמונה, ואם הוא יזהה את הנייר —
                    יריץ עליו גם את הניתוח המלא על מחירים אמיתיים.
                </p>
                <p className="max-w-2xl text-sm opacity-70">
                    שני חלקים נפרדים: קריאת הגרף מבוססת על התמונה בלבד, והניתוח המספרי נשלף ממקור נתונים. מניות
                    בתל אביב יקבלו תמיד את קריאת הגרף, אך הניתוח המלא עליהן תלוי בכיסוי של ספק המחירים.
                </p>
                <p className="opacity-70">
                    מעדיף להקליד סימבול?{' '}
                    <Link href="/bot" className="text-primary">
                        עבור לאנליסט
                    </Link>
                    .
                </p>
            </header>

            <ChartUpload />
        </div>
    );
}
