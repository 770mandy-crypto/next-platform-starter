// Direction 2 — JOURNAL: the collection read as a fashion magazine. Cool paper,
// a Hebrew serif at display size, looks numbered 01–06 because the collection is
// walked in order, and an asymmetric grid that breaks rather than repeats.
import { CART_JS, RESET_CSS, embed, fontLink } from './core.mjs';

const CSS = String.raw`
:root {
  --paper: #f7f6f3;
  --paper-2: #efede8;
  --ink: #17161a;
  --muted: #6e727a;
  --rule: #d5d2cb;
  --accent: #16304f;
  --serif: 'Frank Ruhl Libre', Georgia, serif;
  --sans: 'Assistant', system-ui, sans-serif;
  --util: 'Heebo', system-ui, sans-serif;
}
body { background: var(--paper); color: var(--ink); font-family: var(--sans); font-weight: 300; }
.col { max-width: 1240px; margin: 0 auto; padding-inline: clamp(1.25rem, 5vw, 4rem); }
.util { font-family: var(--util); font-weight: 500; font-size: 0.66rem; letter-spacing: 0.24em; text-transform: uppercase; }

/* ---- masthead ---- */
.masthead { border-bottom: 1px solid var(--ink); }
.masthead-top { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-block: 0.75rem; color: var(--muted); }
.masthead-mid { text-align: center; padding-block: clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 3vw, 1.75rem); }
.masthead-mid h1 {
  font-family: var(--serif); font-weight: 500; margin: 0;
  font-size: clamp(2.75rem, 9vw, 6rem); letter-spacing: 0.14em; line-height: 1;
  padding-inline-start: 0.14em;
}
.masthead-mid p { margin: 0.75rem 0 0; color: var(--muted); }
.masthead-nav { display: flex; justify-content: center; gap: clamp(1rem, 4vw, 2.75rem); border-top: 1px solid var(--rule); padding-block: 0.7rem; flex-wrap: wrap; }
.masthead-nav button { background: none; border: 0; color: var(--muted); padding: 0; }
.masthead-nav button:hover { color: var(--accent); }
.cart-link { background: none; border: 0; color: var(--ink); padding: 0; }
.cart-link b { font-family: var(--util); font-weight: 700; color: var(--accent); }

/* ---- opening spread ---- */
.spread { display: grid; gap: clamp(1.5rem, 4vw, 3rem); padding-block: clamp(2.5rem, 7vw, 5rem); align-items: center; }
@media (min-width: 920px) { .spread { grid-template-columns: 1.15fr 0.85fr; } }
.spread-shot { position: relative; }
.spread-shot img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; }
.spread-shot figcaption { margin-top: 0.6rem; color: var(--muted); font-size: 0.82rem; }
.spread h2 {
  font-family: var(--serif); font-weight: 300; margin: 0 0 1.25rem;
  font-size: clamp(2.1rem, 5.5vw, 3.9rem); line-height: 1.08; text-wrap: balance;
}
.spread h2 em { font-style: italic; color: var(--accent); }
.spread .standfirst { font-size: 1.06rem; line-height: 1.85; color: var(--muted); max-width: 46ch; margin: 0 0 1.75rem; }
.rule-in { display: block; width: 3.5rem; height: 2px; background: var(--accent); margin-bottom: 1.5rem; }
.read-on { background: none; border: 0; border-bottom: 1px solid var(--ink); padding: 0 0 0.2rem; }
.read-on:hover { color: var(--accent); border-color: var(--accent); }

/* ---- contents ---- */
.contents { border-block: 1px solid var(--ink); padding-block: clamp(1.5rem, 4vw, 2.25rem); }
.contents-grid { display: grid; gap: 0.9rem 2rem; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); margin-top: 1.25rem; }
.contents-row { display: flex; align-items: baseline; gap: 0.7rem; background: none; border: 0; padding: 0; text-align: start; width: 100%; }
.contents-row .no { font-family: var(--util); font-weight: 700; color: var(--accent); font-size: 0.78rem; }
.contents-row .nm { font-family: var(--serif); font-size: 1.06rem; border-bottom: 1px solid transparent; }
.contents-row:hover .nm { border-color: var(--ink); }
.contents-row .pr { margin-inline-start: auto; color: var(--muted); font-size: 0.85rem; font-variant-numeric: tabular-nums; }

/* ---- the looks ---- */
.looks { padding-block: clamp(2rem, 6vw, 4rem); display: grid; gap: clamp(3.5rem, 9vw, 7rem); }
.look { display: grid; gap: clamp(1.25rem, 4vw, 2.5rem); align-items: center; }
@media (min-width: 920px) {
  .look { grid-template-columns: 1fr 1fr; }
  .look:nth-child(even) .look-shot { order: 2; }
  .look:nth-child(3n) .look-shot { grid-column: span 1; }
  .look:nth-child(3n) .look-text { padding-inline-start: clamp(1rem, 4vw, 3.5rem); }
}
.look-shot img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; }
.look-no {
  font-family: var(--serif); font-size: clamp(2.4rem, 7vw, 4.5rem); font-weight: 300;
  color: var(--accent); line-height: 1; margin: 0 0 0.5rem; font-variant-numeric: tabular-nums;
}
.look-text h3 { font-family: var(--serif); font-weight: 500; font-size: clamp(1.5rem, 3.4vw, 2.25rem); margin: 0 0 0.35rem; line-height: 1.15; }
.look-text .en { color: var(--muted); margin: 0 0 1.1rem; }
.look-text p.body { line-height: 1.9; color: var(--ink); margin: 0 0 1.5rem; max-width: 48ch; }
.notes { list-style: none; margin: 0 0 1.75rem; padding: 0; display: grid; gap: 0.4rem; border-top: 1px solid var(--rule); padding-top: 1rem; }
.notes li { display: flex; gap: 0.6rem; color: var(--muted); font-size: 0.88rem; line-height: 1.6; }
.notes li::before { content: '—'; color: var(--accent); }
.buy { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
.price-tag { font-family: var(--serif); font-size: 1.5rem; font-variant-numeric: tabular-nums; }
.price-tag s { color: var(--muted); font-size: 0.95rem; margin-inline-start: 0.5rem; }
.size-row { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 1rem; }
.size-row button {
  background: none; border: 1px solid var(--rule); color: var(--muted);
  padding: 0.35rem 0.7rem; min-width: 2.5rem; font-size: 0.85rem;
}
.size-row button:hover { border-color: var(--ink); color: var(--ink); }
.size-row button[aria-pressed="true"] { background: var(--ink); border-color: var(--ink); color: var(--paper); }
.add {
  background: var(--accent); color: var(--paper); border: 0;
  font-family: var(--util); font-weight: 500; font-size: 0.68rem;
  letter-spacing: 0.22em; text-transform: uppercase; padding: 0.85rem 1.9rem;
}
.add:disabled { background: var(--rule); color: var(--muted); }

/* ---- pull quote ---- */
.quote { border-block: 1px solid var(--ink); padding-block: clamp(2.5rem, 7vw, 4.5rem); text-align: center; }
.quote blockquote {
  font-family: var(--serif); font-weight: 300; font-style: italic;
  font-size: clamp(1.5rem, 4.2vw, 2.8rem); line-height: 1.35; margin: 0 auto; max-width: 22ch;
}
.quote cite { display: block; margin-top: 1.5rem; font-style: normal; color: var(--muted); }

/* ---- drawer ---- */
.scrim { position: fixed; inset: 0; background: rgba(23,22,26,0.45); opacity: 0; pointer-events: none; transition: opacity 0.3s; z-index: 80; }
.scrim.on { opacity: 1; pointer-events: auto; }
.drawer {
  position: fixed; inset-block: 0; inset-inline-end: 0; z-index: 90;
  width: min(430px, 100%); background: var(--paper); border-inline-start: 1px solid var(--ink);
  transform: translateX(-100%); transition: transform 0.35s cubic-bezier(0.22,1,0.36,1);
  display: flex; flex-direction: column;
}
.drawer.on { transform: none; }
.drawer-head { display: flex; align-items: center; justify-content: space-between; padding: 1.15rem 1.35rem; border-bottom: 1px solid var(--ink); }
.drawer-head h4 { font-family: var(--serif); font-weight: 500; margin: 0; font-size: 1.15rem; }
.drawer-head button { background: none; border: 0; padding: 0.2rem; }
.drawer-body { flex: 1; overflow-y: auto; padding: 1.35rem; }
.drawer-foot { border-top: 1px solid var(--ink); padding: 1.35rem; }
.cart-item { display: grid; grid-template-columns: 68px 1fr; gap: 0.9rem; padding-bottom: 1.15rem; margin-bottom: 1.15rem; border-bottom: 1px solid var(--rule); }
.cart-item:last-child { border-bottom: 0; margin-bottom: 0; }
.cart-item img { width: 68px; height: 85px; object-fit: cover; }
.cart-item h5 { font-family: var(--serif); font-weight: 500; margin: 0 0 0.2rem; font-size: 0.98rem; }
.cart-item small { color: var(--muted); }
.stepper { display: inline-flex; align-items: center; border: 1px solid var(--rule); margin-top: 0.5rem; }
.stepper button { background: none; border: 0; padding: 0.2rem 0.6rem; }
.stepper span { min-width: 2rem; text-align: center; font-variant-numeric: tabular-nums; font-size: 0.9rem; }
.cart-item .money { font-variant-numeric: tabular-nums; margin-top: 0.5rem; display: block; }
.strike { background: none; border: 0; padding: 0; color: var(--muted); font-size: 0.8rem; text-decoration: underline; margin-top: 0.3rem; }
.strike:hover { color: var(--accent); }
.totals { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 1rem; }
.totals strong { font-family: var(--serif); font-size: 1.5rem; font-variant-numeric: tabular-nums; }
.checkout { width: 100%; background: var(--ink); color: var(--paper); border: 0; padding: 0.95rem; font-family: var(--util); font-weight: 500; font-size: 0.68rem; letter-spacing: 0.22em; text-transform: uppercase; }
.empty { color: var(--muted); text-align: center; padding-block: 3rem; }

/* ---- colophon ---- */
footer { border-top: 1px solid var(--ink); padding-block: clamp(2rem, 5vw, 3.5rem); }
.colophon { display: grid; gap: 1.75rem; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.colophon h6 { margin: 0 0 0.7rem; color: var(--accent); }
.colophon p, .colophon li { color: var(--muted); line-height: 1.8; margin: 0; font-size: 0.9rem; }
.colophon ul { list-style: none; padding: 0; margin: 0; }

.am-toast {
  position: fixed; inset-inline: 0; bottom: 1.5rem; z-index: 120; margin-inline: auto;
  width: max-content; max-width: calc(100% - 2rem);
  background: var(--ink); color: var(--paper); padding: 0.8rem 1.5rem;
  font-family: var(--util); font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase;
  opacity: 0; transform: translateY(120%); transition: opacity 0.3s, transform 0.3s;
}
.am-toast.on { opacity: 1; transform: none; }
`;

const PAGE_JS = String.raw`
const CART_KEY = 'am-journal-cart';
${CART_JS}

const pick = {};
const looksEl = document.getElementById('looks');
const contentsEl = document.getElementById('contents');

function pad(i) { return String(i + 1).padStart(2, '0'); }

function renderContents() {
  contentsEl.innerHTML = PRODUCTS.map((p, i) =>
    '<button class="contents-row" data-jump="' + p.slug + '">' +
      '<span class="no">' + pad(i) + '</span>' +
      '<span class="nm">' + p.titleHe + '</span>' +
      '<span class="pr">' + nis(p.price) + '</span>' +
    '</button>'
  ).join('');
}

function renderLooks() {
  looksEl.innerHTML = PRODUCTS.map((p, i) => {
    const size = pick[p.slug] || '';
    return '<article class="look" id="look-' + p.slug + '">' +
      '<figure class="look-shot" style="margin:0">' +
        '<img src="' + p.img + '" alt="' + p.titleHe + '" loading="lazy">' +
      '</figure>' +
      '<div class="look-text">' +
        '<p class="look-no">' + pad(i) + '</p>' +
        '<h3>' + p.titleHe + '</h3>' +
        '<p class="en util">' + p.title + ' · ' + p.color + '</p>' +
        '<p class="body">' + p.description + '</p>' +
        '<ul class="notes">' + p.details.slice(0, 3).map((d) => '<li>' + d + '</li>').join('') + '</ul>' +
        '<div class="size-row">' + p.sizes.map((s) =>
          '<button data-act="size" data-slug="' + p.slug + '" data-size="' + s + '" aria-pressed="' + (size === s) + '">' + s + '</button>'
        ).join('') + '</div>' +
        '<div class="buy">' +
          '<span class="price-tag">' + nis(p.price) + (p.compareAtPrice ? '<s>' + nis(p.compareAtPrice) + '</s>' : '') + '</span>' +
          '<button class="add" data-act="add" data-slug="' + p.slug + '"' + (size ? '' : ' disabled') + '>' +
            (size ? 'הוספה · ' + size : 'בחרו מידה') +
          '</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }).join('');
}

looksEl.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const { act, slug, size } = el.dataset;
  if (act === 'size') { pick[slug] = size; renderLooks(); }
  else if (act === 'add' && addToCart(slug, pick[slug], 1)) {
    toast('נוסף לעגלה');
    pick[slug] = '';
    renderLooks();
    openDrawer();
  }
});

contentsEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-jump]');
  if (b) document.getElementById('look-' + b.dataset.jump).scrollIntoView({ behavior: 'smooth', block: 'center' });
});

document.getElementById('mastNav').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-to]');
  if (b) document.getElementById(b.dataset.to).scrollIntoView({ behavior: 'smooth' });
});
document.getElementById('readOn').addEventListener('click', () => {
  document.getElementById('contentsSection').scrollIntoView({ behavior: 'smooth' });
});

/* ---- drawer ---- */
const drawer = document.getElementById('drawer');
const scrim = document.getElementById('scrim');
const drawerBody = document.getElementById('drawerBody');
const drawerFoot = document.getElementById('drawerFoot');

function openDrawer() { renderDrawer(); drawer.classList.add('on'); scrim.classList.add('on'); }
function closeDrawer() { drawer.classList.remove('on'); scrim.classList.remove('on'); }

function renderDrawer() {
  if (!cart.length) {
    drawerBody.innerHTML = '<p class="empty">העגלה ריקה.</p>';
    drawerFoot.innerHTML = '';
    return;
  }
  drawerBody.innerHTML = cart.map((l) => {
    const key = lineKey(l.slug, l.size);
    return '<div class="cart-item">' +
      '<img src="' + l.img + '" alt="' + l.titleHe + '">' +
      '<div>' +
        '<h5>' + l.titleHe + '</h5>' +
        '<small>' + l.color + ' · מידה ' + l.size + '</small>' +
        '<div class="stepper">' +
          '<button data-c="minus" data-key="' + key + '" aria-label="פחות">−</button>' +
          '<span>' + l.quantity + '</span>' +
          '<button data-c="plus" data-key="' + key + '" aria-label="עוד">+</button>' +
        '</div>' +
        '<span class="money">' + nis(l.price * l.quantity) + '</span>' +
        '<br><button class="strike" data-c="drop" data-key="' + key + '">הסרה</button>' +
      '</div>' +
    '</div>';
  }).join('');
  drawerFoot.innerHTML =
    '<div class="totals"><span class="util">סך הכל</span><strong data-cart-total></strong></div>' +
    '<button class="checkout" data-c="pay">מעבר לתשלום</button>';
  paintCartHooks();
}

drawerBody.addEventListener('click', onCartClick);
drawerFoot.addEventListener('click', onCartClick);
function onCartClick(e) {
  const el = e.target.closest('[data-c]');
  if (!el) return;
  const key = el.dataset.key;
  const line = cart.find((l) => lineKey(l.slug, l.size) === key);
  const act = el.dataset.c;
  if (act === 'drop') removeLine(key);
  else if (act === 'plus') setLineQty(key, line.quantity + 1);
  else if (act === 'minus') setLineQty(key, line.quantity - 1);
  else if (act === 'pay') toast('זו תצוגה — תשלום אמיתי באתר החי');
}

document.getElementById('cartOpen').addEventListener('click', openDrawer);
document.getElementById('drawerClose').addEventListener('click', closeDrawer);
scrim.addEventListener('click', closeDrawer);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
document.addEventListener('am:cart', () => { if (drawer.classList.contains('on')) renderDrawer(); });

renderContents();
renderLooks();
paintCartHooks();
`;

export const journal = {
  id: 'journal',
  file: 'am-journal.html',
  title: 'AM Journal',
  favicon: '📖',
  description: 'כיוון מגזין אופנה לחנות AM — נייר, סריף עברי גדול, לוקים ממוספרים 01–06 ועגלה עובדת.',
  build(products) {
    return [
      '<title>AM Journal</title>',
      fontLink(['Frank+Ruhl+Libre:wght@300;500;700', 'Assistant:wght@300;400;600', 'Heebo:wght@500;700']),
      '<style>' + RESET_CSS + CSS + '</style>',

      '<header class="masthead">',
      '<div class="col masthead-top util"><span>גיליון 01 · קיץ 2026</span><button class="cart-link util" id="cartOpen">עגלה (<b data-cart-count>0</b>)</button></div>',
      '<div class="col masthead-mid"><h1>AM</h1><p class="util">כתב עת של קולקציה אחת</p></div>',
      '<nav class="col masthead-nav util" id="mastNav">',
      '<button data-to="contentsSection">תוכן העניינים</button>',
      '<button data-to="looks">הלוקים</button>',
      '<button data-to="colophon">על המותג</button>',
      '</nav>',
      '</header>',

      '<main>',
      '<section class="col spread">',
      '<figure class="spread-shot" style="margin:0">',
      `<img src="${products[4].img}" alt="סט AM שחור">`,
      '<figcaption class="util">לוק 05 · סט מלא בשחור</figcaption>',
      '</figure>',
      '<div>',
      '<span class="rule-in"></span>',
      '<h2>שישה פריטים,<br><em>עונה אחת</em>,<br>בלי עודפים</h2>',
      '<p class="standfirst">קולקציה שנבנתה סביב שאלה אחת: מה באמת נשאר בארון אחרי שנה. כותנה מסורקת כבדה, גזרות שנבדקו על גופים אמיתיים, ורקמה שלא מתקלפת בכביסה השלישית.</p>',
      '<button class="read-on util" id="readOn">קראו את הגיליון ↓</button>',
      '</div>',
      '</section>',

      '<section class="col contents" id="contentsSection">',
      '<span class="util" style="color:var(--muted)">תוכן העניינים</span>',
      '<div class="contents-grid" id="contents"></div>',
      '</section>',

      '<section class="col looks" id="looks"></section>',

      '<section class="quote"><div class="col">',
      '<blockquote>בגד טוב הוא כזה שאתה שוכח שאתה לובש אותו.</blockquote>',
      '<cite class="util">מתוך שיחה עם המעצב</cite>',
      '</div></section>',
      '</main>',

      '<footer id="colophon"><div class="col colophon">',
      '<div><h6 class="util">קולופון</h6><p>AM Clothing נוסד ב-2025 בתל אביב. כל פריט נתפר בישראל בסדרות קצרות.</p></div>',
      '<div><h6 class="util">משלוח</h6><ul><li>חינם מעל ₪250</li><li>2–4 ימי עסקים</li><li>איסוף עצמי בתל אביב</li></ul></div>',
      '<div><h6 class="util">החזרות</h6><ul><li>14 יום להחלפה</li><li>הפריט עם התווית</li></ul></div>',
      '<div><h6 class="util">קשר</h6><ul><li>hello@amclothing.co.il</li><li>@amclothing</li></ul></div>',
      '</div></footer>',

      '<div class="scrim" id="scrim"></div>',
      '<aside class="drawer" id="drawer" aria-label="עגלת קניות">',
      '<div class="drawer-head"><h4>העגלה</h4><button id="drawerClose" aria-label="סגירה">✕</button></div>',
      '<div class="drawer-body" id="drawerBody"></div>',
      '<div class="drawer-foot" id="drawerFoot"></div>',
      '</aside>',

      '<script>',
      embed('PRODUCTS', products),
      PAGE_JS,
      '</script>'
    ].join('\n');
  }
};
