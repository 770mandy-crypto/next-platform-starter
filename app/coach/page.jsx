import { CoachChat } from './coach-chat.jsx';
import { ExerciseLibrary } from './exercise-library.jsx';

export const metadata = {
    title: 'מאמן כושר AI'
};

export default function CoachPage() {
    return (
        <div dir="rtl" className="flex flex-col gap-16 text-right">
            <section className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 text-sm font-semibold rounded-full bg-primary/15 text-primary">
                    <span>🥗</span> אימון בריא ומותאם אישית
                </div>
                <h1 className="mb-4">מאמן הכושר החכם שלכם</h1>
                <p className="max-w-2xl mx-auto text-lg text-white/80">
                    צ׳אט מאמן מבוסס AI שבונה לכם תוכנית אימון אישית תוך שניות, לפי המטרה, הרמה והזמן שלכם — עם
                    הוראות ביצוע מפורטות והדגמות וידאו לכל תרגיל. הכל בעברית, בכל מקום, ללא צורך בציוד.
                </p>
                <div className="flex flex-wrap justify-center gap-3 mt-8 text-sm">
                    <Badge>💬 צ׳אט חכם</Badge>
                    <Badge>🎥 סרטוני הדרכה</Badge>
                    <Badge>📋 תוכניות אישיות</Badge>
                    <Badge>🏠 אימון בבית</Badge>
                </div>
            </section>

            <section>
                <h2 className="mb-2">דברו עם המאמן</h2>
                <p className="mb-6 text-white/70">
                    ספרו למאמן מה תרצו להשיג והוא יבנה לכם אימון. לדוגמה: "אימון אירובי של 15 דקות" או "לחזק בטן
                    ורגליים למתחילים".
                </p>
                <CoachChat />
            </section>

            <section>
                <h2 className="mb-2">ספריית התרגילים</h2>
                <p className="mb-6 text-white/70">
                    כל התרגילים עם הוראות ביצוע ברורות והדגמת וידאו. סננו לפי סוג האימון.
                </p>
                <ExerciseLibrary />
            </section>

            <section className="p-6 text-sm border rounded-lg border-white/15 bg-white/5 text-white/70">
                <h3 className="mb-2 text-white">⚕️ הערה חשובה</h3>
                <p>
                    האימונים כאן הם המלצה כללית בלבד ואינם תחליף לייעוץ רפואי. התייעצו עם רופא לפני תחילת פעילות
                    גופנית, במיוחד אם יש לכם מצב בריאותי קיים. עצרו מיד אם אתם חשים כאב, סחרחורת או קוצר נשימה.
                </p>
            </section>
        </div>
    );
}

function Badge({ children }) {
    return <span className="px-3 py-1.5 rounded-full bg-white/10 text-white/90">{children}</span>;
}
