import Link from 'next/link';
import { nis } from 'lib/store/format';

// What goes with this. A tee is shown its shorts, shorts their tee, and either
// the set that holds both — matched on colour first, so a black shirt is not
// paired with white shorts.
const GOES_WITH = {
  tees: ['shorts', 'sets'],
  shorts: ['tees', 'sets'],
  sets: ['tees', 'shorts']
};

export function CompleteTheLook({ product, products }) {
  const wanted = GOES_WITH[product.category] || [];
  const picks = wanted
    .map((category) => {
      const inCategory = (products || []).filter((p) => p.category === category && p.slug !== product.slug);
      return inCategory.find((p) => p.color === product.color) || inCategory[0];
    })
    .filter(Boolean);

  if (picks.length === 0) return null;

  return (
    <section className="look-section">
      <h2 className="section-title">להשלים את הלוק</h2>
      <div className="look-grid">
        {picks.map((p) => (
          <Link className="look-card" key={p.slug} href={`/store/product/${p.slug}`}>
            <span className="look-shot">
              <img src={p.image_path} alt={p.title} loading="lazy" />
            </span>
            <span className="look-info">
              <span className="look-name">{p.title_he || p.title}</span>
              <span className="look-colour">{p.color}</span>
              <span className="look-price">{nis(p.price)}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
