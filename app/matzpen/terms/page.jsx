export const metadata = { title: 'תנאי שימוש ופרטיות' };

// A plain-language starting point. Have a lawyer review it before launch.
export default function TermsPage() {
    return (
        <main className="mx-auto max-w-3xl space-y-4 p-4 leading-relaxed">
            <h1 className="text-2xl font-black">תנאי שימוש ופרטיות</h1>
            <section>
                <h2 className="text-lg font-black">המידע באתר</h2>
                <p>
                    הנתונים מבוססים על מידע ציבורי (רשות המסים, הלשכה המרכזית לסטטיסטיקה) ועל עיבוד שלנו. ציון הצמיחה מתאר נתוני עבר ואינו תחזית. תשובות הסוכן נוצרות על ידי
                    בינה מלאכותית ועלולות לכלול טעויות. שום דבר באתר אינו ייעוץ השקעות, ייעוץ משפטי או שמאות.
                </p>
            </section>
            <section>
                <h2 className="text-lg font-black">מודעות של בעלי דירות</h2>
                <p>
                    המודעות מתפרסמות על ידי המפרסמים, באחריותם. אנחנו לא בודקים את נכונותן, לא גובים עמלה ולא צד לעסקה. מותר לפרסם רק דירה שבבעלותכם או שהוסמכתם למכור. מודעות
                    נמחקות אוטומטית אחרי 60 יום, ואפשר למחוק קודם דרך קישור הניהול.
                </p>
            </section>
            <section>
                <h2 className="text-lg font-black">פרטיות</h2>
                <p>
                    מספר הטלפון של מפרסם מוצג רק למי שלוחץ ״דברו עם בעל הדירה״, ומספר הפניות מוגבל. שאלות לסוכן נשלחות לספק הבינה המלאכותית (Anthropic) לצורך מתן התשובה.
                    פרטים שנמסרים ברשימת העדכונים משמשים רק לשליחת עדכונים. לבקשת מחיקת מידע: צרו קשר.
                </p>
            </section>
        </main>
    );
}
