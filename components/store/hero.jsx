import Link from 'next/link';

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-media">
        <img src="/store/images/am-set-black.jpg" alt="קולקציית AM CLOTHING — סט שחור עם רקמת זהב" />
      </div>
      <div className="hero-copy">
        <p className="eyebrow">קולקציית הפתיחה · 2026</p>
        <h1>
          לבוש שנשאר
          <br />
          <em>נקי לאורך זמן</em>
        </h1>
        <p>
          כותנה מסורקת כבדה, גזרות שלא מתעוותות בכביסה, ולוגו רקום בזהב. סדרה מוגבלת בשחור, לבן וזהב — בלי יותר מדי, ובלי
          פחות ממה שצריך.
        </p>
        <div className="hero-cta">
          <a className="btn-gold" href="#catalog">
            לקולקציה
          </a>
          <Link className="btn-line" href="/store/cart">
            לעגלה שלי
          </Link>
        </div>
      </div>
    </section>
  );
}
