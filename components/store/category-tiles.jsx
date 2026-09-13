import Link from 'next/link';

// One tile per category, each carrying a real garment from it. The count comes
// from the catalogue rather than a hand-written number, so a new product cannot
// leave the tile lying.
const TILES = [
  { key: 'tees', label: 'חולצות', note: 'כותנה מסורקת, 240 גרם' },
  { key: 'shorts', label: 'מכנסיים', note: 'פוטר כבד, 320 גרם' },
  { key: 'sets', label: 'סטים', note: 'חולצה ומכנסיים יחד' }
];

export function CategoryTiles({ products }) {
  const tiles = TILES.map((tile) => {
    const inCategory = (products || []).filter((p) => p.category === tile.key);
    return { ...tile, count: inCategory.length, image: inCategory[0]?.image_path };
  }).filter((tile) => tile.count > 0);

  if (tiles.length === 0) return null;

  return (
    <section className="wrap tiles-section">
      <h2 className="section-title">קנו לפי קטגוריה</h2>
      <div className="tiles">
        {tiles.map((tile) => (
          <Link key={tile.key} className="tile" href={`/store?cat=${tile.key}#catalog`}>
            <span className="tile-shot">
              <img src={tile.image} alt={tile.label} loading="lazy" />
            </span>
            <span className="tile-body">
              <span className="tile-name">{tile.label}</span>
              <span className="tile-note">{tile.note}</span>
              <span className="tile-count">
                {tile.count} {tile.count === 1 ? 'דגם' : 'דגמים'}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
