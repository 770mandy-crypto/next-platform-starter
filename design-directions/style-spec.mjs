// Direction 3 — SPEC: the catalogue as a technical document. Hairline grid you
// can see, no radii anywhere, and every garment stated as measured data —
// fabric, weight, chest and length in centimetres — rather than atmosphere.
import { CART_JS, CATEGORIES, MEASURES, RESET_CSS, SPECS, embed, fontLink } from './core.mjs';

const CSS = String.raw`
:root {
  --ground: #f2f2f0;
  --panel: #ffffff;
  --ink: #0d0d0c;
  --muted: #6b6b68;
  --rule: #0d0d0c;
  --hair: #c9c9c4;
  --signal: #0026ff;
  --mono: 'IBM Plex Mono', ui-monospace, monospace;
  --heb: 'Miriam Libre', 'IBM Plex Mono', sans-serif;
}
body { background: var(--ground); color: var(--ink); font-family: var(--heb); font-size: 15px; }
.mono { font-family: var(--mono); font-variant-numeric: tabular-nums; }
.frame { max-width: 1320px; margin: 0 auto; border-inline: 1px solid var(--rule); }
.pad { padding: clamp(0.9rem, 2.5vw, 1.5rem); }

/* ---- terminal bar ---- */
.bar {
  position: sticky; top: 0; z-index: 60;
  background: var(--ink); color: var(--ground);
  display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
  padding: 0.5rem clamp(0.9rem, 2.5vw, 1.5rem);
  font-family: var(--mono); font-size: 0.78rem; letter-spacing: 0.02em;
}
.bar .id { font-weight: 700; }
.bar .sep { color: #6a6a66; }
.bar .manifest-open {
  margin-inline-start: auto; background: var(--signal); color: #fff; border: 0;
  font-family: var(--mono); font-size: 0.78rem; padding: 0.3rem 0.7rem; font-weight: 700;
}

/* ---- header block ---- */
.head { border-bottom: 1px solid var(--rule); }
.head h1 { font-family: var(--mono); font-weight: 700; font-size: clamp(1.6rem, 5vw, 2.9rem); margin: 0 0 0.4rem; letter-spacing: -0.02em; }
.head p { margin: 0; color: var(--muted); max-width: 62ch; line-height: 1.7; }
.meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); border-top: 1px solid var(--hair); margin-top: 1.1rem; }
.meta div { border-inline-end: 1px solid var(--hair); padding: 0.7rem 0.9rem; }
.meta div:last-child { border-inline-end: 0; }
.meta dt { font-family: var(--mono); font-size: 0.66rem; letter-spacing: 0.12em; color: var(--muted); text-transform: uppercase; margin: 0 0 0.25rem; }
.meta dd { margin: 0; font-family: var(--mono); font-size: 0.9rem; }

/* ---- filter strip ---- */
.strip { display: flex; align-items: stretch; border-bottom: 1px solid var(--rule); background: var(--panel); flex-wrap: wrap; }
.strip .lbl { font-family: var(--mono); font-size: 0.7rem; letter-spacing: 0.12em; color: var(--muted); padding: 0.75rem 1rem; border-inline-end: 1px solid var(--hair); display: flex; align-items: center; text-transform: uppercase; }
.strip button {
  background: none; border: 0; border-inline-end: 1px solid var(--hair);
  font-family: var(--mono); font-size: 0.8rem; padding: 0.75rem 1.15rem; color: var(--muted);
}
.strip button:hover { background: var(--ground); color: var(--ink); }
.strip button[aria-pressed="true"] { background: var(--signal); color: #fff; }
.strip .tally { margin-inline-start: auto; font-family: var(--mono); font-size: 0.78rem; color: var(--muted); padding: 0.75rem 1rem; border-inline-start: 1px solid var(--hair); }

/* ---- units ---- */
.units { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 400px), 1fr)); }
.unit { border-bottom: 1px solid var(--rule); border-inline-end: 1px solid var(--rule); background: var(--panel); display: flex; flex-direction: column; }
.unit-top { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; border-bottom: 1px solid var(--hair); padding: 0.5rem 0.8rem; font-family: var(--mono); font-size: 0.72rem; letter-spacing: 0.06em; }
.unit-top .ref { font-weight: 700; }
.unit-top .cat { color: var(--muted); text-transform: uppercase; }
.unit-shot { aspect-ratio: 1 / 1; border-bottom: 1px solid var(--hair); background: var(--ground); }
.unit-shot img { width: 100%; height: 100%; object-fit: cover; }
.unit-name { padding: 0.75rem 0.8rem 0.5rem; }
.unit-name h3 { margin: 0; font-family: var(--mono); font-size: 0.98rem; font-weight: 700; }
.unit-name span { color: var(--muted); font-size: 0.85rem; }
table.rows { width: 100%; border-collapse: collapse; font-family: var(--mono); font-size: 0.78rem; }
table.rows th, table.rows td { border-top: 1px solid var(--hair); padding: 0.4rem 0.8rem; text-align: start; }
table.rows th { color: var(--muted); font-weight: 400; width: 40%; text-transform: uppercase; font-size: 0.68rem; letter-spacing: 0.08em; }
table.rows td { font-variant-numeric: tabular-nums; }
.unit-pick { border-top: 1px solid var(--hair); padding: 0.7rem 0.8rem; margin-top: auto; }
.pick-label { font-family: var(--mono); font-size: 0.66rem; letter-spacing: 0.12em; color: var(--muted); text-transform: uppercase; display: block; margin-bottom: 0.45rem; }
.pick-row { display: grid; grid-template-columns: repeat(5, 1fr); border: 1px solid var(--rule); }
.pick-row button { background: var(--panel); border: 0; border-inline-end: 1px solid var(--hair); font-family: var(--mono); font-size: 0.8rem; padding: 0.45rem 0; }
.pick-row button:last-child { border-inline-end: 0; }
.pick-row button:hover { background: var(--ground); }
.pick-row button[aria-pressed="true"] { background: var(--ink); color: var(--ground); }
.unit-buy { display: flex; border: 1px solid var(--rule); border-top: 0; }
.unit-buy .cost { font-family: var(--mono); font-weight: 700; padding: 0.6rem 0.8rem; border-inline-end: 1px solid var(--rule); font-variant-numeric: tabular-nums; }
.unit-buy button { flex: 1; background: var(--signal); color: #fff; border: 0; font-family: var(--mono); font-size: 0.8rem; font-weight: 700; letter-spacing: 0.04em; }
.unit-buy button:disabled { background: var(--hair); color: var(--muted); }

/* ---- measurement drawer inside a unit ---- */
.measure { border-top: 1px solid var(--hair); }
.measure summary { font-family: var(--mono); font-size: 0.72rem; letter-spacing: 0.08em; padding: 0.5rem 0.8rem; cursor: pointer; color: var(--muted); text-transform: uppercase; }
.measure summary:hover { color: var(--signal); }
.measure[open] summary { color: var(--ink); }

/* ---- manifest ---- */
.manifest {
  position: fixed; inset-block-end: 0; inset-inline: 0; z-index: 90;
  background: var(--panel); border-top: 2px solid var(--rule);
  transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.22,1,0.36,1);
  max-height: 80vh; display: flex; flex-direction: column;
}
.manifest.on { transform: none; }
.manifest-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: var(--ink); color: var(--ground); padding: 0.5rem clamp(0.9rem, 2.5vw, 1.5rem); font-family: var(--mono); font-size: 0.78rem; }
.manifest-head button { background: none; border: 1px solid var(--ground); color: var(--ground); font-family: var(--mono); font-size: 0.72rem; padding: 0.15rem 0.55rem; }
.manifest-body { overflow-y: auto; }
table.manifest-table { width: 100%; border-collapse: collapse; font-family: var(--mono); font-size: 0.8rem; }
table.manifest-table th { text-align: start; color: var(--muted); font-weight: 400; font-size: 0.66rem; letter-spacing: 0.12em; text-transform: uppercase; padding: 0.5rem 0.8rem; border-bottom: 1px solid var(--rule); }
table.manifest-table td { padding: 0.5rem 0.8rem; border-bottom: 1px solid var(--hair); vertical-align: middle; font-variant-numeric: tabular-nums; }
table.manifest-table img { width: 38px; height: 46px; object-fit: cover; }
.qty-cell { display: inline-flex; border: 1px solid var(--hair); }
.qty-cell button { background: none; border: 0; padding: 0.15rem 0.5rem; font-family: var(--mono); }
.qty-cell span { min-width: 1.8rem; text-align: center; padding-block: 0.15rem; }
.rm { background: none; border: 0; color: var(--muted); font-family: var(--mono); font-size: 0.72rem; text-decoration: underline; padding: 0; }
.rm:hover { color: var(--signal); }
.manifest-foot { border-top: 2px solid var(--rule); display: flex; align-items: center; gap: 1rem; padding: 0.75rem clamp(0.9rem, 2.5vw, 1.5rem); flex-wrap: wrap; }
.manifest-foot .sum { font-family: var(--mono); font-weight: 700; font-size: 1.15rem; font-variant-numeric: tabular-nums; }
.manifest-foot .sum-label { font-family: var(--mono); font-size: 0.66rem; letter-spacing: 0.12em; color: var(--muted); text-transform: uppercase; }
.submit { margin-inline-start: auto; background: var(--ink); color: var(--ground); border: 0; font-family: var(--mono); font-size: 0.82rem; font-weight: 700; padding: 0.6rem 1.6rem; }
.void { font-family: var(--mono); color: var(--muted); padding: 2rem; text-align: center; font-size: 0.85rem; }

/* ---- footer ---- */
footer { border-top: 1px solid var(--rule); background: var(--panel); }
.foot-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
.foot-cols section { border-inline-end: 1px solid var(--hair); padding: 1.1rem; }
.foot-cols section:last-child { border-inline-end: 0; }
.foot-cols h4 { font-family: var(--mono); font-size: 0.66rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--signal); margin: 0 0 0.6rem; }
.foot-cols p, .foot-cols li { color: var(--muted); font-size: 0.85rem; line-height: 1.7; margin: 0; }
.foot-cols ul { list-style: none; padding: 0; margin: 0; font-family: var(--mono); font-size: 0.78rem; }

.am-toast {
  position: fixed; inset-inline-start: 1rem; bottom: 1rem; z-index: 120;
  background: var(--ink); color: var(--ground); font-family: var(--mono); font-size: 0.78rem;
  padding: 0.55rem 1rem; opacity: 0; transform: translateY(120%); transition: opacity 0.2s, transform 0.2s;
}
.am-toast.on { opacity: 1; transform: none; }
`;

const PAGE_JS = String.raw`
const CART_KEY = 'am-spec-cart';
${CART_JS}

let filter = 'all';
const pick = {};
const unitsEl = document.getElementById('units');
const tallyEl = document.getElementById('tally');

function ref(p, i) { return p.category.slice(0, 3).toUpperCase() + '-' + String(i + 1).padStart(2, '0'); }

function renderUnits() {
  const list = PRODUCTS.map((p, i) => ({ p, ref: ref(p, i) })).filter(({ p }) => filter === 'all' || p.category === filter);
  tallyEl.textContent = list.length + '/' + PRODUCTS.length + ' UNITS';
  unitsEl.innerHTML = list.map(({ p, ref }) => {
    const spec = SPECS[p.category];
    const size = pick[p.slug] || '';
    const measures = MEASURES[p.category];
    return '<article class="unit">' +
      '<div class="unit-top"><span class="ref">' + ref + '</span><span class="cat">' + p.category + ' / ' + p.color + '</span></div>' +
      '<div class="unit-shot"><img src="' + p.img + '" alt="' + p.title + '" loading="lazy"></div>' +
      '<div class="unit-name"><h3>' + p.title + '</h3><span>' + p.titleHe + '</span></div>' +
      '<table class="rows">' +
        '<tr><th>בד</th><td>' + spec.fabric + '</td></tr>' +
        '<tr><th>משקל</th><td>' + spec.weight + '</td></tr>' +
        '<tr><th>גזרה</th><td>' + spec.fit + '</td></tr>' +
        '<tr><th>כביסה</th><td>' + spec.wash + '</td></tr>' +
      '</table>' +
      '<details class="measure">' +
        '<summary>טבלת מידות ↓</summary>' +
        '<table class="rows"><tr><th>מידה</th><td>חזה / אורך (ס״מ)</td></tr>' +
        p.sizes.map((s) => '<tr><th>' + s + '</th><td>' + measures[s][0] + ' / ' + measures[s][1] + '</td></tr>').join('') +
        '</table>' +
      '</details>' +
      '<div class="unit-pick">' +
        '<span class="pick-label">בחירת מידה</span>' +
        '<div class="pick-row">' + p.sizes.map((s) =>
          '<button data-act="size" data-slug="' + p.slug + '" data-size="' + s + '" aria-pressed="' + (size === s) + '">' + s + '</button>'
        ).join('') + '</div>' +
        '<div class="unit-buy">' +
          '<span class="cost">' + nis(p.price) + '</span>' +
          '<button data-act="add" data-slug="' + p.slug + '"' + (size ? '' : ' disabled') + '>' +
            (size ? 'ADD ' + size : 'SELECT SIZE') +
          '</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }).join('');
}

unitsEl.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const { act, slug, size } = el.dataset;
  if (act === 'size') { pick[slug] = size; renderUnits(); }
  else if (act === 'add' && addToCart(slug, pick[slug], 1)) {
    toast('ADDED / ' + bySlug(slug).title);
    pick[slug] = '';
    renderUnits();
  }
});

document.getElementById('strip').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-cat]');
  if (!b) return;
  filter = b.dataset.cat;
  document.querySelectorAll('#strip button[data-cat]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.cat === filter)));
  renderUnits();
});

/* ---- manifest ---- */
const manifest = document.getElementById('manifest');
const manifestBody = document.getElementById('manifestBody');
const manifestFoot = document.getElementById('manifestFoot');

function renderManifest() {
  if (!cart.length) {
    manifestBody.innerHTML = '<p class="void">NO UNITS SELECTED</p>';
    manifestFoot.innerHTML = '';
    return;
  }
  manifestBody.innerHTML =
    '<table class="manifest-table">' +
    '<thead><tr><th></th><th>פריט</th><th>מידה</th><th>כמות</th><th>סכום</th><th></th></tr></thead><tbody>' +
    cart.map((l) => {
      const key = lineKey(l.slug, l.size);
      return '<tr>' +
        '<td><img src="' + l.img + '" alt=""></td>' +
        '<td>' + l.title + '<br><span style="color:var(--muted)">' + l.color + '</span></td>' +
        '<td>' + l.size + '</td>' +
        '<td><span class="qty-cell">' +
          '<button data-c="minus" data-key="' + key + '" aria-label="פחות">−</button>' +
          '<span>' + l.quantity + '</span>' +
          '<button data-c="plus" data-key="' + key + '" aria-label="עוד">+</button>' +
        '</span></td>' +
        '<td>' + nis(l.price * l.quantity) + '</td>' +
        '<td><button class="rm" data-c="drop" data-key="' + key + '">מחק</button></td>' +
      '</tr>';
    }).join('') + '</tbody></table>';
  manifestFoot.innerHTML =
    '<span class="sum-label">TOTAL / כולל משלוח</span>' +
    '<span class="sum" data-cart-total></span>' +
    '<button class="submit" data-c="pay">שלח הזמנה</button>';
  paintCartHooks();
}

function onManifestClick(e) {
  const el = e.target.closest('[data-c]');
  if (!el) return;
  const key = el.dataset.key;
  const line = cart.find((l) => lineKey(l.slug, l.size) === key);
  const act = el.dataset.c;
  if (act === 'drop') removeLine(key);
  else if (act === 'plus') setLineQty(key, line.quantity + 1);
  else if (act === 'minus') setLineQty(key, line.quantity - 1);
  else if (act === 'pay') toast('DEMO / תשלום אמיתי באתר החי');
}
manifestBody.addEventListener('click', onManifestClick);
manifestFoot.addEventListener('click', onManifestClick);

document.getElementById('manifestOpen').addEventListener('click', () => {
  renderManifest();
  manifest.classList.toggle('on');
});
document.getElementById('manifestClose').addEventListener('click', () => manifest.classList.remove('on'));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') manifest.classList.remove('on'); });
document.addEventListener('am:cart', () => { if (manifest.classList.contains('on')) renderManifest(); });

renderUnits();
paintCartHooks();
`;

export const spec = {
  id: 'spec',
  file: 'am-spec.html',
  title: 'AM SPEC',
  favicon: '📐',
  description: 'כיוון טכני לחנות AM — רשת קווים גלויה, פונט מכונת־כתיבה וכל פריט כדף מפרט עם משקל בד ומידות בס״מ.',
  build(products) {
    return [
      '<title>AM SPEC</title>',
      fontLink(['IBM+Plex+Mono:wght@400;700', 'Miriam+Libre:wght@400;700']),
      '<style>' + RESET_CSS + CSS + '</style>',

      '<div class="bar">',
      '<span class="id">AM_CLOTHING</span><span class="sep">/</span><span>CATALOGUE_2026</span>',
      '<span class="sep">/</span><span>REV.01</span>',
      '<button class="manifest-open" id="manifestOpen">MANIFEST [<span data-cart-count>0</span>]</button>',
      '</div>',

      '<div class="frame">',
      '<header class="head pad">',
      '<h1>SPEC SHEET / 2026</h1>',
      '<p>שישה פריטים, שני צבעים, חמש מידות. כל מספר בעמוד הזה נמדד על פריט אמיתי — משקל הבד בגרם למטר מרובע, ורוחב החזה והאורך בסנטימטרים על מוצר שטוח.</p>',
      '<dl class="meta">',
      '<div><dt>יחידות</dt><dd class="mono">06</dd></div>',
      '<div><dt>מידות</dt><dd class="mono">S–XXL</dd></div>',
      '<div><dt>תפירה</dt><dd class="mono">ישראל</dd></div>',
      '<div><dt>עדכון</dt><dd class="mono">2026-01</dd></div>',
      '</dl>',
      '</header>',

      '<div class="strip" id="strip">',
      '<span class="lbl">FILTER</span>',
      CATEGORIES.map((c) => `<button data-cat="${c.key}" aria-pressed="${c.key === 'all'}">${c.en} · ${c.he}</button>`).join(''),
      '<span class="tally mono" id="tally"></span>',
      '</div>',

      '<div class="units" id="units"></div>',

      '<footer><div class="foot-cols">',
      '<section><h4>SHIPPING</h4><ul><li>FREE &gt; ₪250</li><li>2–4 ימי עסקים</li><li>PICKUP / תל אביב</li></ul></section>',
      '<section><h4>RETURNS</h4><ul><li>14 יום</li><li>עם תווית</li><li>החזר מלא</li></ul></section>',
      '<section><h4>CARE</h4><ul><li>30° הפוך</li><li>ללא מייבש</li><li>גיהוץ מהצד הפנימי</li></ul></section>',
      '<section><h4>CONTACT</h4><ul><li>hello@amclothing.co.il</li><li>@amclothing</li></ul></section>',
      '</div></footer>',
      '</div>',

      '<aside class="manifest" id="manifest" aria-label="רשימת הזמנה">',
      '<div class="manifest-head"><span>ORDER MANIFEST</span><button id="manifestClose">CLOSE ✕</button></div>',
      '<div class="manifest-body" id="manifestBody"></div>',
      '<div class="manifest-foot" id="manifestFoot"></div>',
      '</aside>',

      '<script>',
      embed('PRODUCTS', products),
      embed('SPECS', SPECS),
      embed('MEASURES', MEASURES),
      PAGE_JS,
      '</script>'
    ].join('\n');
  }
};
