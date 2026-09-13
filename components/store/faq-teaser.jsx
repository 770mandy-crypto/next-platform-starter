import Link from 'next/link';

// The four questions that decide whether someone finishes an order: what it
// costs to ship, how long it takes, what happens if the size is wrong, and
// whether paying is safe. Answering them on the home page saves the trip to
// the shipping page — and the trip away.
const QUESTIONS = [
  {
    q: 'כמה עולה המשלוח?',
    a: 'חינם בהזמנה מעל ₪250. מתחת לזה ₪29 לכל הארץ, או איסוף עצמי בתל אביב בלי עלות.'
  },
  {
    q: 'מתי זה מגיע?',
    a: '3–5 ימי עסקים מרגע התשלום. הזמנות שנקלטות אחרי 14:00 יוצאות ביום העסקים הבא.'
  },
  {
    q: 'ואם המידה לא מתאימה?',
    a: 'החלפת מידה ראשונה על חשבוננו, תוך 14 יום, כל עוד הפריט לא נלבש והתווית עליו.'
  },
  {
    q: 'איך משלמים?',
    a: 'בכרטיס אשראי דרך Stripe. פרטי הכרטיס לא עוברים דרכנו ולא נשמרים אצלנו בשום שלב.'
  }
];

export function FaqTeaser() {
  return (
    <section className="wrap faq-section">
      <div className="faq-head">
        <h2 className="section-title">שאלות לפני שקונים</h2>
        <Link className="faq-more" href="/store/shipping">
          כל השאלות
        </Link>
      </div>
      <div className="faq-grid">
        {QUESTIONS.map((item) => (
          <div className="faq-item" key={item.q}>
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
