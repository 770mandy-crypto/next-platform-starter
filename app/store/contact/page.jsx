export const metadata = { title: 'צור קשר' };

export default function ContactPage() {
  return (
    <>
      <div className="wrap page-head">
        <h1>צור קשר</h1>
        <p>שאלה על מידה, על הזמנה קיימת, או סתם משהו שהייתם רוצים לראות בקולקציה — אנחנו עונים לכל פנייה.</p>
      </div>

      <div className="wrap">
        <div className="info-grid">
          <article className="info-card">
            <h3>מייל</h3>
            <p>
              <a href="mailto:hello@amclothing.co.il" dir="ltr">
                hello@amclothing.co.il
              </a>
              <br />
              תשובה תוך יום עסקים אחד.
            </p>
          </article>
          <article className="info-card">
            <h3>אינסטגרם</h3>
            <p>
              <span dir="ltr">@am.clothing</span>
              <br />
              הדרך הכי מהירה לשאלה קצרה.
            </p>
          </article>
          <article className="info-card">
            <h3>איסוף עצמי</h3>
            <p>
              תל אביב, בתיאום מראש.
              <br />
              בלי עלות משלוח.
            </p>
          </article>
        </div>

        <div className="prose">
          <h2>לפני שכותבים</h2>
          <p>
            הרבה שאלות כבר מכוסות: זמני משלוח, עלויות והחזרות נמצאים בעמוד{' '}
            <a href="/store/shipping">משלוח והחזרות</a>, ומידות מדויקות של כל פריט נמצאות ב
            <a href="/store/sizes">טבלת המידות</a>. סטטוס של הזמנה קיימת מופיע בעמוד{' '}
            <a href="/store/account">החשבון שלי</a>.
          </p>

          <h2>פנייה על הזמנה קיימת</h2>
          <p>
            כדי שנוכל לעזור מהר, צרפו למייל את מספר ההזמנה (הוא מופיע באישור ששלחנו) ואת מה שתרצו לשנות. אם מדובר
            בהחזרה או החלפה, ציינו גם את הפריט והמידה.
          </p>
        </div>
      </div>
    </>
  );
}
