import { LegalPage } from 'components/fit/legal-page';
import { offer } from 'lib/offer-config';

export const metadata = { title: 'מדיניות פרטיות' };

export default function PrivacyPage() {
    const { site } = offer;
    return (
        <LegalPage title="מדיניות פרטיות">
            <section>
                <h2>איזה מידע אנחנו אוספים</h2>
                <p>
                    ברכישה נאסף שם מלא, מספר טלפון וכתובת מייל. פרטי כרטיס האשראי מוזנים בדף התשלום של Grow (משולם) ואינם
                    מגיעים אלינו.
                </p>
            </section>
            <section>
                <h2>למה המידע משמש</h2>
                <p>
                    לביצוע התשלום, למשלוח התוכנית והקבלה, ולמענה לפניות. לא נשלח דיוור שיווקי בלי הסכמה מפורשת, ולא נמכור את
                    המידע לאף אחד.
                </p>
            </section>
            <section>
                <h2>עם מי המידע משותף</h2>
                <p>
                    עם ספקים שנחוצים להפעלת השירות בלבד: Grow (משולם) לסליקה, Resend למשלוח המיילים, ו-Netlify לאחסון האתר.
                </p>
            </section>
            <section>
                <h2>הזכויות שלך</h2>
                <p>
                    ניתן לבקש לעיין במידע שנשמר עליך, לתקן אותו או למחוק אותו בפנייה ל-
                    <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
                </p>
            </section>
        </LegalPage>
    );
}
