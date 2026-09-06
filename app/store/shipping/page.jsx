export const metadata = { title: 'משלוח והחזרות' };

export default function ShippingPage() {
  return (
    <>
      <div className="wrap page-head">
        <h1>משלוח והחזרות</h1>
        <p>כל מה שצריך לדעת לפני ואחרי ההזמנה — זמנים, עלויות, ומה קורה אם המידה לא מתאימה.</p>
      </div>

      <div className="wrap">
        <div className="info-grid">
          <article className="info-card">
            <h3>משלוח חינם</h3>
            <span className="figure">₪250</span>
            <p>בהזמנה מעל ₪250 המשלוח על חשבוננו. מתחת לזה — ₪29 לכל הארץ.</p>
          </article>
          <article className="info-card">
            <h3>זמן אספקה</h3>
            <span className="figure">3–5</span>
            <p>ימי עסקים מרגע התשלום. הזמנות שנקלטות אחרי 14:00 יוצאות ביום העסקים הבא.</p>
          </article>
          <article className="info-card">
            <h3>החזרה</h3>
            <span className="figure">14</span>
            <p>יום להחזרה או החלפה, כל עוד הפריט לא נלבש והתווית עליו.</p>
          </article>
        </div>

        <div className="faq">
          <details open>
            <summary>איך עוקבים אחרי ההזמנה?</summary>
            <p>
              מיד אחרי התשלום נשלח אישור הזמנה למייל. כשהחבילה יוצאת נשלח מספר מעקב. אפשר גם לראות את כל ההזמנות
              בעמוד <a href="/store/account">החשבון שלי</a>.
            </p>
          </details>
          <details>
            <summary>אפשר לאסוף עצמאית?</summary>
            <p>כן. יש נקודת איסוף בתל אביב בתיאום מראש, בלי עלות משלוח. כתבו לנו אחרי ההזמנה ונתאם.</p>
          </details>
          <details>
            <summary>איך מחזירים פריט?</summary>
            <p>
              שלחו לנו מייל עם מספר ההזמנה ומה תרצו להחזיר, ונחזור אליכם עם הוראות. ההחזר מבוצע לאותו אמצעי תשלום תוך
              עד 7 ימי עסקים מרגע שהפריט מגיע אלינו.
            </p>
          </details>
          <details>
            <summary>מה אם המידה לא מתאימה?</summary>
            <p>
              החלפת מידה היא על חשבוננו בפעם הראשונה. לפני ההזמנה כדאי לעבור על <a href="/store/sizes">טבלת המידות</a> —
              היא מבוססת על מדידה של הפריט עצמו, לא על מידה כללית.
            </p>
          </details>
          <details>
            <summary>איך משלמים?</summary>
            <p>
              התשלום מתבצע דרך Stripe בכרטיס אשראי. פרטי הכרטיס לא עוברים דרכנו ולא נשמרים אצלנו בשום שלב.
            </p>
          </details>
        </div>
      </div>
    </>
  );
}
