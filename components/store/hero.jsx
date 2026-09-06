import Link from 'next/link';

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-media">
        <img src="/store/images/am-set-white.jpg" alt="קולקציית AM CLOTHING — סט לבן עם רקמת זהב" />
      </div>
      <div className="hero-copy">
        <p className="eyebrow">קולקציית הפתיחה · 2026</p>
        <h1>
          לבוש שנשאר
          <br />
          <em>נקי לאורך זמן</em>
        </h1>
        <p>
          כותנה מסורקת כבדה, גזרות שלא מתעוותות בכביסה, ולוגו רקום בזהב. שישה פריטים בסדרה מוגבלת, בלי יותר מדי ובלי
          פחות ממה שצריך.
        </p>
        <div className="hero-cta">
          <a className="btn-gold" href="#catalog">
            לקולקציה
          </a>
          <Link className="btn-line" href="/store/sizes">
            טבלת מידות
          </Link>
        </div>
      </div>
    </section>
  );
}
