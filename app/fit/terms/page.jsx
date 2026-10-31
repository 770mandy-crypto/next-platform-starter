import { LegalPage } from 'components/fit/legal-page';
import { offer } from 'lib/offer-config';

export const metadata = { title: 'תקנון ומדיניות ביטולים' };

export default function TermsPage() {
    const { site } = offer;
    return (
        <LegalPage title="תקנון ומדיניות ביטולים">
            <section>
                <h2>כללי</h2>
                <p>
                    האתר מופעל על ידי {site.businessName}
                    {site.businessId && ` (${site.businessId})`}. השימוש באתר ורכישה בו מהווים הסכמה לתנאים אלה.
                </p>
            </section>
            <section>
                <h2>המוצר</h2>
                <p>
                    {offer.tagline} בפורמט דיגיטלי. לאחר אישור התשלום נשלח לכתובת המייל שנמסרה ברכישה קישור לתוכנית. הרכישה
                    היא תשלום חד-פעמי ואינה מנוי מתחדש.
                </p>
            </section>
            <section>
                <h2>מחירים ותשלום</h2>
                <p>
                    המחירים באתר בשקלים חדשים וכוללים מע״מ כחוק. התשלום מתבצע בדף תשלום מאובטח של חברת Grow (משולם), ופרטי
                    כרטיס האשראי אינם נשמרים אצלנו. הנחות המוצגות באתר תקפות לרכישה דרך האתר בלבד.
                </p>
            </section>
            <section>
                <h2>ביטול עסקה</h2>
                <p>
                    ניתן לבטל את העסקה בהתאם לחוק הגנת הצרכן, התשמ״א-1981 ותקנותיו, בתוך {site.refundDays} ימים ממועד הרכישה,
                    בפנייה בכתב לכתובת <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>. הזיכוי יינתן לאמצעי
                    התשלום ששימש לרכישה, בניכוי דמי ביטול ככל שהחוק מתיר.
                </p>
            </section>
            <section>
                <h2>בריאות ואחריות</h2>
                <p>
                    התוכנית אינה מהווה ייעוץ רפואי. לפני תחילת פעילות גופנית מומלץ להתייעץ עם רופא. המשתמש/ת אחראי/ת להתאמן
                    בזהירות ובהתאם למצבו/ה הבריאותי, ולהפסיק את האימון בכל מקרה של כאב או אי-נוחות.
                </p>
            </section>
            <section>
                <h2>קניין רוחני</h2>
                <p>התוכנית ותכניה מיועדים לשימוש אישי של הרוכש/ת בלבד, ואין להעתיקם, להפיצם או למכור אותם לאחרים.</p>
            </section>
            <section>
                <h2>יצירת קשר</h2>
                <p>
                    לכל שאלה: <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
                </p>
            </section>
        </LegalPage>
    );
}
