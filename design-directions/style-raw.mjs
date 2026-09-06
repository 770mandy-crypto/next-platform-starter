// Direction 1 — RAW: streetwear. Near-black ground, one signal orange, type
// large enough to run past the edge of the screen, cart as a full takeover.
// Deliberately single-theme: the dark ground is the identity here.
import { CART_JS, CATEGORIES, RESET_CSS, embed, fontLink } from './core.mjs';

const CSS = String.raw`
:root {
  --ground: #0b0b0c;
  --surface: #141416;
  --line: #2a2a2e;
  --ink: #f4f4f2;
  --muted: #8f8a84;
  --signal: #ff3d00;
  --display: 'Heebo', system-ui, sans-serif;
}
body {
  background: var(--ground);
  color: var(--ink);
  font-family: 'Heebo', system-ui, sans-serif;
  overflow-x: hidden;
}
.shell { max-width: 1400px; margin: 0 auto; padding-inline: clamp(1rem, 3vw, 2.5rem); }

/* ---- masthead ---- */
.masthead {
  position: sticky; top: 0; z-index: 60;
  background: var(--ground); border-bottom: 2px solid var(--ink);
}
.masthead-in { display: flex; align-items: center; gap: 1.25rem; padding-block: 0.85rem; }
.wordmark {
  font-family: var(--display); font-weight: 900; font-size: 1.5rem;
  letter-spacing: -0.03em; line-height: 1;
}
.wordmark span { color: var(--signal); }
.masthead nav { display: flex; gap: 0.35rem; margin-inline-start: auto; flex-wrap: wrap; }
.masthead nav button {
  background: none; border: 2px solid transparent; color: var(--muted);
  font-weight: 700; font-size: 0.8rem; padding: 0.4rem 0.7rem;
}
.masthead nav button[aria-pressed="true"] { color: var(--ground); background: var(--signal); }
.masthead nav button:hover { color: var(--ink); }
.cart-trigger {
  background: var(--ink); color: var(--ground); border: 0;
  font-weight: 900; font-size: 0.85rem; padding: 0.55rem 1rem;
  display: flex; align-items: center; gap: 0.5rem;
}
.cart-trigger b { background: var(--signal); color: var(--ground); padding: 0 0.4rem; }
.cart-trigger b[data-empty] { background: var(--ground); color: var(--ink); }

/* ---- hero: the type is the picture ---- */
.hero { position: relative; padding-block: clamp(2rem, 6vw, 4rem) 0; }
.hero h1 {
  font-family: var(--display); font-weight: 900;
  font-size: clamp(3.5rem, 16vw, 12rem); line-height: 0.82;
  letter-spacing: -0.045em; margin: 0;
  position: relative; z-index: 2; pointer-events: none;
}
.hero h1 .out {
  color: transparent; -webkit-text-stroke: 2px var(--ink);
}
.hero h1 .fill { color: var(--signal); }
.hero-stage { position: relative; margin-top: -2vw; }
.hero-stage img {
  width: min(52vw, 560px); margin-inline-start: auto;
  aspect-ratio: 3 / 4; object-fit: cover;
}
.hero-note {
  position: absolute; inset-block-end: 8%; inset-inline-start: 0; z-index: 3;
  max-width: 30ch; background: var(--ground); border: 2px solid var(--ink);
  padding: 1rem 1.15rem; font-size: 0.95rem; line-height: 1.6; color: var(--muted);
}
.hero-note strong { color: var(--ink); display: block; margin-bottom: 0.35rem; font-size: 1rem; }

/* ---- marquee ---- */
.marquee {
  border-block: 2px solid var(--ink); background: var(--signal); color: var(--ground);
  overflow: hidden; margin-top: clamp(2rem, 5vw, 3.5rem);
}
.marquee-track {
  display: flex; gap: 2.5rem; padding-block: 0.6rem; width: max-content;
  font-family: var(--display); font-weight: 900; font-size: 1.05rem; letter-spacing: 0.02em;
  animation: slide 26s linear infinite;
}
@keyframes slide { to { transform: translateX(50%); } }
@media (prefers-reduced-motion: reduce) { .marquee-track { animation: none; } }

/* ---- catalogue ---- */
.catalogue { padding-block: clamp(3rem, 7vw, 5rem); }
.catalogue-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem; }
.catalogue-head h2 {
  font-family: var(--display); font-weight: 900; font-size: clamp(2rem, 6vw, 3.5rem);
  letter-spacing: -0.035em; margin: 0; line-height: 1;
}
.count { color: var(--muted); font-weight: 700; font-size: 0.9rem; }
.rack { display: grid; gap: clamp(1rem, 2.5vw, 2rem); grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); }
.piece { background: var(--surface); border: 2px solid var(--line); display: flex; flex-direction: column; }
.piece:hover { border-color: var(--signal); }
.piece-shot { position: relative; aspect-ratio: 1 / 1; overflow: hidden; background: #000; }
.piece-shot img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
.piece:hover .piece-shot img { transform: scale(1.05); }
.sticker {
  position: absolute; top: 0.85rem; inset-inline-start: 0.85rem;
  background: var(--signal); color: var(--ground);
  font-family: var(--display); font-weight: 900; font-size: 0.72rem;
  padding: 0.3rem 0.6rem; transform: rotate(-3deg);
}
.tag {
  position: absolute; bottom: 0.85rem; inset-inline-end: 0.85rem;
  background: var(--ink); color: var(--ground);
  font-family: var(--display); font-weight: 900; font-size: 1.15rem;
  padding: 0.25rem 0.7rem; transform: rotate(2deg); font-variant-numeric: tabular-nums;
}
.piece-body { padding: 1rem 1.1rem 1.15rem; display: flex; flex-direction: column; gap: 0.7rem; flex: 1; }
.piece-body h3 { font-family: var(--display); font-weight: 900; font-size: 1.05rem; margin: 0; letter-spacing: -0.01em; }
.piece-body p { margin: 0; color: var(--muted); font-size: 0.88rem; line-height: 1.55; flex: 1; }
.sizes { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.sizes button {
  background: none; border: 2px solid var(--line); color: var(--muted);
  font-weight: 700; font-size: 0.78rem; padding: 0.3rem 0.55rem; min-width: 2.4rem;
}
.sizes button:hover { border-color: var(--ink); color: var(--ink); }
.sizes button[aria-pressed="true"] { background: var(--ink); border-color: var(--ink); color: var(--ground); }
.piece-actions { display: flex; gap: 0.5rem; }
.grab {
  flex: 1; background: var(--signal); color: var(--ground); border: 0;
  font-family: var(--display); font-weight: 900; font-size: 0.9rem; padding: 0.75rem;
}
.grab:disabled { background: var(--line); color: var(--muted); }
.look {
  background: none; border: 2px solid var(--line); color: var(--muted);
  font-weight: 700; font-size: 0.8rem; padding: 0.75rem 0.9rem;
}
.look:hover { border-color: var(--ink); color: var(--ink); }

/* ---- takeover: detail and cart share the same full-screen shell ---- */
.takeover {
  position: fixed; inset: 0; z-index: 90; background: var(--ground);
  overflow-y: auto; display: none;
}
.takeover.on { display: block; }
.takeover-bar {
  position: sticky; top: 0; background: var(--ground); border-bottom: 2px solid var(--ink);
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  padding: 0.85rem clamp(1rem, 3vw, 2.5rem);
}
.takeover-bar h2 { font-family: var(--display); font-weight: 900; font-size: 1.15rem; margin: 0; }
.shut { background: var(--ink); color: var(--ground); border: 0; font-weight: 900; padding: 0.45rem 0.9rem; }
.detail { display: grid; gap: clamp(1.5rem, 4vw, 3rem); padding-block: clamp(1.5rem, 4vw, 3rem); }
@media (min-width: 900px) { .detail { grid-template-columns: 1.1fr 1fr; align-items: start; } }
.detail-shot { aspect-ratio: 3 / 4; background: #000; }
.detail-shot img { width: 100%; height: 100%; object-fit: cover; }
.detail h3 { font-family: var(--display); font-weight: 900; font-size: clamp(1.8rem, 5vw, 3rem); margin: 0 0 0.5rem; letter-spacing: -0.03em; line-height: 1; }
.detail .money { font-family: var(--display); font-weight: 900; font-size: 1.6rem; color: var(--signal); margin: 0 0 1.25rem; font-variant-numeric: tabular-nums; }
.detail p.desc { color: var(--muted); line-height: 1.75; margin: 0 0 1.5rem; }
.spec { list-style: none; padding: 0; margin: 0 0 1.75rem; display: grid; gap: 0.45rem; }
.spec li { border-inline-start: 3px solid var(--signal); padding-inline-start: 0.7rem; font-size: 0.88rem; color: var(--muted); }
.label { display: block; font-weight: 900; font-size: 0.75rem; letter-spacing: 0.12em; margin-bottom: 0.55rem; color: var(--muted); }
.qty { display: flex; align-items: center; border: 2px solid var(--line); width: max-content; }
.qty button { background: none; border: 0; color: var(--ink); font-weight: 900; font-size: 1.1rem; padding: 0.4rem 0.85rem; }
.qty span { min-width: 2.5rem; text-align: center; font-weight: 900; font-variant-numeric: tabular-nums; }
.detail-actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; flex-wrap: wrap; }

/* ---- cart lines ---- */
.lines { display: grid; gap: 1rem; padding-block: clamp(1.5rem, 4vw, 2.5rem); }
.line { display: grid; grid-template-columns: 84px 1fr auto; gap: 1rem; align-items: center; border: 2px solid var(--line); padding: 0.75rem; }
.line img { width: 84px; height: 100px; object-fit: cover; }
.line h4 { margin: 0 0 0.2rem; font-family: var(--display); font-weight: 900; font-size: 0.95rem; }
.line small { color: var(--muted); font-size: 0.82rem; }
.line-money { font-family: var(--display); font-weight: 900; font-variant-numeric: tabular-nums; }
.drop { background: none; border: 0; color: var(--muted); font-weight: 700; font-size: 0.8rem; text-decoration: underline; padding: 0; margin-top: 0.4rem; }
.drop:hover { color: var(--signal); }
.sum { border-top: 2px solid var(--ink); padding-block: 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.sum-total { font-family: var(--display); font-weight: 900; font-size: 1.8rem; font-variant-numeric: tabular-nums; }
.pay { background: var(--signal); color: var(--ground); border: 0; font-family: var(--display); font-weight: 900; font-size: 1rem; padding: 0.9rem 2rem; }
.hollow { color: var(--muted); padding-block: 3rem; text-align: center; font-weight: 700; }

/* ---- footer ---- */
footer { border-top: 2px solid var(--ink); padding-block: clamp(2rem, 5vw, 3rem); }
.foot-grid { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
.foot-grid h5 { font-family: var(--display); font-weight: 900; font-size: 0.8rem; letter-spacing: 0.12em; margin: 0 0 0.6rem; color: var(--signal); }
.foot-grid p, .foot-grid li { color: var(--muted); font-size: 0.88rem; line-height: 1.7; margin: 0; }
.foot-grid ul { list-style: none; padding: 0; margin: 0; }

/* ---- toast ---- */
.am-toast {
  position: fixed; inset-inline: 1rem; bottom: 1rem; z-index: 120; margin-inline: auto;
  width: max-content; max-width: calc(100% - 2rem);
  background: var(--signal); color: var(--ground);
  font-family: var(--display); font-weight: 900; padding: 0.75rem 1.4rem;
  opacity: 0; transform: translateY(140%); transition: opacity 0.25s, transform 0.25s;
}
.am-toast.on { opacity: 1; transform: none; }
`;

const PAGE_JS = String.raw`
const CART_KEY = 'am-raw-cart';
${CART_JS}

let filter = 'all';
const pick = {};
let openSlug = null;
let detailQty = 1;

const rack = document.getElementById('rack');
const countEl = document.getElementById('count');

function shown() {
  return PRODUCTS.filter((p) => filter === 'all' || p.category === filter);
}

function renderRack() {
  const list = shown();
  countEl.textContent = list.length + ' פריטים';
  rack.innerHTML = list.map((p) => {
    const size = pick[p.slug] || '';
    return '<article class="piece">' +
      '<div class="piece-shot">' +
        (p.badge ? '<span class="sticker">' + p.badge + '</span>' : '') +
        '<img src="' + p.img + '" alt="' + p.title + '" loading="lazy">' +
        '<span class="tag">' + nis(p.price) + '</span>' +
      '</div>' +
      '<div class="piece-body">' +
        '<h3>' + p.title + '</h3>' +
        '<p>' + p.short + '</p>' +
        '<div class="sizes">' + p.sizes.map((s) =>
          '<button data-act="size" data-slug="' + p.slug + '" data-size="' + s + '" aria-pressed="' + (size === s) + '">' + s + '</button>'
        ).join('') + '</div>' +
        '<div class="piece-actions">' +
          '<button class="grab" data-act="grab" data-slug="' + p.slug + '"' + (size ? '' : ' disabled') + '>' +
            (size ? 'קח את זה · ' + size : 'בחר מידה') +
          '</button>' +
          '<button class="look" data-act="look" data-slug="' + p.slug + '">פרטים</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }).join('');
}

rack.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const { act, slug, size } = el.dataset;
  if (act === 'size') { pick[slug] = size; renderRack(); }
  else if (act === 'grab') {
    if (addToCart(slug, pick[slug], 1)) { toast('נוסף · ' + bySlug(slug).title); pick[slug] = ''; renderRack(); }
  } else if (act === 'look') openDetail(slug);
});

document.getElementById('nav').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-cat]');
  if (!b) return;
  filter = b.dataset.cat;
  document.querySelectorAll('#nav button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.cat === filter)));
  renderRack();
  document.getElementById('catalogue').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* ---- detail takeover ---- */
const detailPane = document.getElementById('detail');
const detailBody = document.getElementById('detailBody');
const detailTitle = document.getElementById('detailTitle');

function openDetail(slug) {
  openSlug = slug;
  detailQty = 1;
  renderDetail();
  show(detailPane);
}

function renderDetail() {
  const p = bySlug(openSlug);
  if (!p) return;
  const size = pick[p.slug] || '';
  detailTitle.textContent = p.title;
  detailBody.innerHTML =
    '<div class="detail-shot"><img src="' + p.img + '" alt="' + p.title + '"></div>' +
    '<div>' +
      '<h3>' + p.titleHe + '</h3>' +
      '<p class="money">' + nis(p.price) + (p.compareAtPrice ? ' <s style="color:var(--muted);font-size:1rem">' + nis(p.compareAtPrice) + '</s>' : '') + '</p>' +
      '<p class="desc">' + p.description + '</p>' +
      '<ul class="spec">' + p.details.map((d) => '<li>' + d + '</li>').join('') + '</ul>' +
      '<span class="label">מידה</span>' +
      '<div class="sizes">' + p.sizes.map((s) =>
        '<button data-d="size" data-size="' + s + '" aria-pressed="' + (size === s) + '">' + s + '</button>'
      ).join('') + '</div>' +
      '<div class="detail-actions">' +
        '<div class="qty">' +
          '<button data-d="minus" aria-label="פחות">−</button><span>' + detailQty + '</span><button data-d="plus" aria-label="עוד">+</button>' +
        '</div>' +
        '<button class="grab" data-d="grab" style="flex:1;min-width:12rem"' + (size ? '' : ' disabled') + '>' +
          (size ? 'קח את זה · ' + nis(p.price * detailQty) : 'בחר מידה') +
        '</button>' +
      '</div>' +
    '</div>';
}

detailBody.addEventListener('click', (e) => {
  const el = e.target.closest('[data-d]');
  if (!el) return;
  const p = bySlug(openSlug);
  const act = el.dataset.d;
  if (act === 'size') pick[p.slug] = el.dataset.size;
  else if (act === 'plus') detailQty = Math.min(10, detailQty + 1);
  else if (act === 'minus') detailQty = Math.max(1, detailQty - 1);
  else if (act === 'grab') {
    if (addToCart(p.slug, pick[p.slug], detailQty)) {
      toast('נוסף · ' + p.title);
      hide(detailPane);
      renderRack();
      return;
    }
  }
  renderDetail();
});

/* ---- cart takeover ---- */
const cartPane = document.getElementById('cartPane');
const cartBody = document.getElementById('cartBody');

function renderCart() {
  if (!cart.length) {
    cartBody.innerHTML = '<p class="hollow">העגלה ריקה. קח משהו.</p>';
    return;
  }
  cartBody.innerHTML =
    '<div class="lines">' + cart.map((l) => {
      const key = lineKey(l.slug, l.size);
      return '<div class="line">' +
        '<img src="' + l.img + '" alt="' + l.title + '">' +
        '<div>' +
          '<h4>' + l.title + '</h4>' +
          '<small>' + l.color + ' · מידה ' + l.size + '</small>' +
          '<br><button class="drop" data-c="drop" data-key="' + key + '">הסר</button>' +
        '</div>' +
        '<div style="text-align:start">' +
          '<div class="qty" style="margin-bottom:0.4rem">' +
            '<button data-c="minus" data-key="' + key + '" aria-label="פחות">−</button>' +
            '<span>' + l.quantity + '</span>' +
            '<button data-c="plus" data-key="' + key + '" aria-label="עוד">+</button>' +
          '</div>' +
          '<div class="line-money">' + nis(l.price * l.quantity) + '</div>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>' +
    '<div class="sum">' +
      '<span class="label" style="margin:0">סה״כ · משלוח חינם</span>' +
      '<span class="sum-total" data-cart-total></span>' +
      '<button class="pay" data-c="pay">לתשלום</button>' +
    '</div>';
  paintCartHooks();
}

cartBody.addEventListener('click', (e) => {
  const el = e.target.closest('[data-c]');
  if (!el) return;
  const key = el.dataset.key;
  const line = cart.find((l) => lineKey(l.slug, l.size) === key);
  const act = el.dataset.c;
  if (act === 'drop') removeLine(key);
  else if (act === 'plus') setLineQty(key, line.quantity + 1);
  else if (act === 'minus') setLineQty(key, line.quantity - 1);
  else if (act === 'pay') { toast('זו תצוגה — תשלום אמיתי באתר החי'); return; }
});

/* ---- panes ---- */
function show(pane) { pane.classList.add('on'); document.body.style.overflow = 'hidden'; }
function hide(pane) { pane.classList.remove('on'); document.body.style.overflow = ''; }
document.getElementById('cartOpen').addEventListener('click', () => { renderCart(); show(cartPane); });
document.querySelectorAll('[data-shut]').forEach((b) => b.addEventListener('click', () => hide(b.closest('.takeover'))));
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.takeover.on').forEach(hide);
});
document.addEventListener('am:cart', () => { if (cartPane.classList.contains('on')) renderCart(); });

renderRack();
paintCartHooks();
`;

export const raw = {
  id: 'raw',
  file: 'am-raw.html',
  title: 'AM RAW',
  favicon: '🔥',
  description: 'כיוון סטריטוור לחנות AM — רקע שחור, טיפוגרפיה ענקית וכתום סיגנל, עם עגלה עובדת.',
  build(products) {
    const marquee = ['משלוח חינם מעל ₪250', 'קולקציית 2026', 'רקמת זהב · לא הדפס', 'מלאי מוגבל', 'AM CLOTHING'];
    return [
      '<title>AM RAW</title>',
      fontLink(['Heebo:wght@400;700;900']),
      '<style>' + RESET_CSS + CSS + '</style>',

      '<header class="masthead"><div class="shell masthead-in">',
      '<div class="wordmark">AM<span>.</span></div>',
      '<nav id="nav">',
      CATEGORIES.map((c) => `<button data-cat="${c.key}" aria-pressed="${c.key === 'all'}">${c.he}</button>`).join(''),
      '</nav>',
      '<button class="cart-trigger" id="cartOpen">עגלה <b data-cart-count>0</b></button>',
      '</div></header>',

      '<main>',
      '<section class="shell hero">',
      '<h1><span class="out">לבוש</span><br><span class="fill">בלי</span> <span class="out">פילטר</span></h1>',
      '<div class="hero-stage">',
      `<img src="${products[0].img}" alt="חולצת AM שחורה">`,
      '<div class="hero-note"><strong>קולקציית 2026</strong>כותנה כבדה, גזרה ישרה, לוגו רקום. שישה פריטים, בלי עודפים ובלי הנחות סוף עונה.</div>',
      '</div>',
      '</section>',

      '<div class="marquee"><div class="marquee-track">',
      [...marquee, ...marquee].map((t) => `<span>${t}</span><span>✕</span>`).join(''),
      '</div></div>',

      '<section class="shell catalogue" id="catalogue">',
      '<div class="catalogue-head"><h2>הסחורה</h2><span class="count" id="count"></span></div>',
      '<div class="rack" id="rack"></div>',
      '</section>',
      '</main>',

      '<footer><div class="shell foot-grid">',
      '<div><h5>AM CLOTHING</h5><p>מותג ישראלי. כותנה כבדה, גזרות שלא נופלות אחרי כביסה, ורקמה במקום הדפס.</p></div>',
      '<div><h5>משלוחים</h5><ul><li>חינם מעל ₪250</li><li>2–4 ימי עסקים</li><li>איסוף עצמי בתל אביב</li></ul></div>',
      '<div><h5>החזרות</h5><ul><li>14 יום להחלפה</li><li>הפריט עם התווית</li><li>החזר לאותו אמצעי תשלום</li></ul></div>',
      '<div><h5>יצירת קשר</h5><ul><li>וואטסאפ · 03-0000000</li><li>אינסטגרם · @amclothing</li></ul></div>',
      '</div></footer>',

      // Detail takeover
      '<div class="takeover" id="detail" role="dialog" aria-modal="true" aria-label="פרטי פריט">',
      '<div class="takeover-bar"><h2 id="detailTitle"></h2><button class="shut" data-shut>סגור ✕</button></div>',
      '<div class="shell detail" id="detailBody"></div>',
      '</div>',

      // Cart takeover
      '<div class="takeover" id="cartPane" role="dialog" aria-modal="true" aria-label="עגלה">',
      '<div class="takeover-bar"><h2>העגלה שלך</h2><button class="shut" data-shut>סגור ✕</button></div>',
      '<div class="shell" id="cartBody"></div>',
      '</div>',

      '<script>',
      embed('PRODUCTS', products),
      PAGE_JS,
      '</script>'
    ].join('\n');
  }
};
