export function BrandSection() {
  return (
    <section className="brand" id="brand">
      <div className="wrap brand-grid">
        <div className="brand-shot">
          <img src="/store/images/brand-logo.jpg" alt="הלוגו של AM CLOTHING בזהב" />
        </div>
        <div>
          <p className="eyebrow">המותג</p>
          <h2>הפרט שאי אפשר להדפיס</h2>
          <p>
            הלוגו של AM נרקם בחוט זהב, לא מודפס. רקמה לא מתקלפת בכביסה ולא נסדקת אחרי עונה — היא נשארת בדיוק כמו ביום
            הראשון. זה הפרט שהכי קל לחסוך בו, ובדיוק בגללו התחלנו.
          </p>
          <p>הקולקציה נשארת קטנה בכוונה: שני צבעים, שתי גזרות, וסט שמחבר ביניהן. כל פריט נבחר כי הוא עובד לבד וגם ביחד.</p>
          <div className="pillars">
            <div className="pillar">
              <h6>הבד</h6>
              <p>כותנה מסורקת 240 גרם למ״ר. נופלת ישר, לא מתעוותת.</p>
            </div>
            <div className="pillar">
              <h6>הרקמה</h6>
              <p>חוט זהב על החזה השמאלי. לא הדפס.</p>
            </div>
            <div className="pillar">
              <h6>המשלוח</h6>
              <p>חינם לכל הארץ, 3–5 ימי עסקים.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
