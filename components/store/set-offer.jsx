import Link from 'next/link';
import { nis } from 'lib/store/format';

// The one genuine offer in the catalogue, stated from the catalogue's own
// numbers: a set costs less than its two garments bought apart. If the prices
// change, or the saving disappears, so does this band.
export function SetOffer({ products }) {
  const set = (products || []).find((p) => p.category === 'sets' && p.compare_at_price > p.price);
  if (!set) return null;

  const saving = set.compare_at_price - set.price;

  return (
    <section className="offer">
      <div className="wrap offer-grid">
        <div className="offer-shot">
          <img src={set.image_path} alt={set.title} loading="lazy" />
        </div>
        <div className="offer-copy">
          <p className="eyebrow">הסט המלא</p>
          <h2>חולצה ומכנסיים, {nis(saving)} פחות</h2>
          <p>
            אותם שני פריטים בדיוק שנמכרים בנפרד, באותה מידה או בשתי מידות שונות. {nis(set.compare_at_price)} כשקונים
            אותם לחוד, {nis(set.price)} כסט.
          </p>
          <div className="offer-figures">
            <span className="offer-was">{nis(set.compare_at_price)}</span>
            <span className="offer-now">{nis(set.price)}</span>
            <span className="offer-save">חיסכון {nis(saving)}</span>
          </div>
          <div className="hero-cta">
            <Link className="btn-gold" href="/store?cat=sets#catalog">
              לסטים
            </Link>
            <Link className="btn-line" href={`/store/product/${set.slug}`}>
              לפריט
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
