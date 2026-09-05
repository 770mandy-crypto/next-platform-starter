// Shown instead of crashing whenever a page needs an external service (Supabase,
// Stripe, Resend) that hasn't been configured yet. See STORE_SETUP.md for the
// exact steps and env var names each item refers to.
export function SetupNotice({ title = 'עוד לא מוכן להפעלה', items }) {
  return (
    <section className="wrap setup-notice">
      <p className="eyebrow">להשלמת ההקמה</p>
      <h1>{title}</h1>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="setup-notice-foot">
        ההוראות המלאות, כולל שמות משתני הסביבה, נמצאות בקובץ <code>STORE_SETUP.md</code> בשורש הפרויקט.
      </p>
    </section>
  );
}
