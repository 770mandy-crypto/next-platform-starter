// Direction 4 — SHOP: built to buy from, not to admire. Products on screen
// immediately, a filter rail that stays put, size chosen on the card itself,
// and a bar along the bottom that always says what the basket costs.
import { CART_JS, CATEGORIES, MEASURES, RESET_CSS, embed, fontLink } from './core.mjs';

const CSS = String.raw`
:root {
  --bg: #ffffff;
  --surface: #f5f6f8;
  --line: #e3e5e9;
  --ink: #14161a;
  --muted: #6b7280;
  --accent: #1f6feb;
  --accent-dark: #1552b8;
  --stock: #157347;
  --sans: 'Rubik', system-ui, sans-serif;
}
body { background: var(--bg); color: var(--ink); font-family: var(--sans); font-size: 15px; padding-bottom: 4.5rem; }

/* ---- header ---- */
.top { position: sticky; top: 0; z-index: 60; background: var(--bg); border-bottom: 1px solid var(--line); }
.top-in { display: flex; align-items: center; gap: 0.75rem; padding: 0.7rem clamp(0.85rem, 3vw, 1.75rem); max-width: 1500px; margin: 0 auto; }
.brand { font-weight: 700; font-size: 1.2rem; letter-spacing: -0.01em; flex-shrink: 0; }
.search { flex: 1; position: relative; max-width: 520px; }
.search input {
  width: 100%; padding: 0.6rem 2.4rem 0.6rem 0.9rem; border: 1px solid var(--line);
  border-radius: 8px; background: var(--surface); font-size: 0.92rem;
}
.search input:focus { outline: none; border-color: var(--accent); background: var(--bg); box-shadow: 0 0 0 3px rgba(31,111,235,0.14); }
.search::after { content: '⌕'; position: absolute; inset-inline-end: 0.8rem; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 1.1rem; }
.top-cart { margin-inline-start: auto; display: flex; align-items: center; gap: 0.4rem; background: none; border: 1px solid var(--line); border-radius: 8px; padding: 0.5rem 0.8rem; font-weight: 500; font-size: 0.9rem; }
.top-cart:hover { border-color: var(--accent); color: var(--accent); }
.top-cart b { background: var(--accent); color: #fff; border-radius: 999px; min-width: 1.35rem; height: 1.35rem; display: inline-grid; place-items: center; font-size: 0.75rem; }
.top-cart b[data-empty] { background: var(--muted); }

/* ---- layout ---- */
.page { max-width: 1500px; margin: 0 auto; padding: 1.25rem clamp(0.85rem, 3vw, 1.75rem) 3rem; display: grid; gap: 1.5rem; }
@media (min-width: 940px) { .page { grid-template-columns: 232px 1fr; align-items: start; } }

/* ---- filter rail ---- */
.rail { display: grid; gap: 1.25rem; }
@media (min-width: 940px) { .rail { position: sticky; top: 4.4rem; } }
.rail h3 { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 0 0 0.6rem; font-weight: 500; }
.rail-group { border: 1px solid var(--line); border-radius: 10px; padding: 0.9rem; }
.opt { display: flex; align-items: center; gap: 0.55rem; padding: 0.28rem 0; font-size: 0.92rem; cursor: pointer; }
.opt input { accent-color: var(--accent); width: 1rem; height: 1rem; }
.opt .n { margin-inline-start: auto; color: var(--muted); font-size: 0.8rem; font-variant-numeric: tabular-nums; }
.chipset { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.chipset button { border: 1px solid var(--line); background: var(--bg); border-radius: 999px; padding: 0.32rem 0.75rem; font-size: 0.85rem; color: var(--muted); }
.chipset button:hover { border-color: var(--ink); color: var(--ink); }
.chipset button[aria-pressed="true"] { background: var(--ink); border-color: var(--ink); color: #fff; }
.clear { background: none; border: 0; color: var(--accent); font-size: 0.85rem; padding: 0; text-decoration: underline; }

/* ---- results bar ---- */
.results { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem; }
.results .n { color: var(--muted); font-size: 0.9rem; }
.results select { margin-inline-start: auto; border: 1px solid var(--line); border-radius: 8px; padding: 0.45rem 0.7rem; background: var(--bg); font-size: 0.88rem; }
.results select:focus { outline: none; border-color: var(--accent); }

/* ---- product grid ---- */
.goods { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr)); }
.good { border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: var(--bg); display: flex; flex-direction: column; transition: box-shadow 0.2s, border-color 0.2s; }
.good:hover { border-color: #cfd3da; box-shadow: 0 6px 20px rgba(20,22,26,0.07); }
.good-shot { position: relative; aspect-ratio: 1 / 1; background: var(--surface); }
.good-shot img { width: 100%; height: 100%; object-fit: cover; }
.flag { position: absolute; top: 0.6rem; inset-inline-start: 0.6rem; background: var(--ink); color: #fff; font-size: 0.68rem; font-weight: 500; padding: 0.2rem 0.5rem; border-radius: 5px; }
.flag.save { background: var(--accent); }
.good-info { padding: 0.75rem 0.8rem 0.85rem; display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
.good-info h3 { margin: 0; font-size: 0.92rem; font-weight: 500; line-height: 1.35; }
.good-info .sub { color: var(--muted); font-size: 0.82rem; margin: 0; }
.cost { display: flex; align-items: baseline; gap: 0.4rem; font-variant-numeric: tabular-nums; }
.cost .now { font-weight: 700; font-size: 1.02rem; }
.cost .was { color: var(--muted); text-decoration: line-through; font-size: 0.85rem; }
.instock { display: flex; align-items: center; gap: 0.35rem; color: var(--stock); font-size: 0.78rem; }
.instock::before { content: ''; width: 0.45rem; height: 0.45rem; border-radius: 50%; background: currentColor; }
.size-pick { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: auto; }
.size-pick button { border: 1px solid var(--line); background: var(--bg); border-radius: 6px; min-width: 2.1rem; padding: 0.25rem 0.35rem; font-size: 0.8rem; color: var(--muted); }
.size-pick button:hover { border-color: var(--ink); color: var(--ink); }
.size-pick button[aria-pressed="true"] { background: var(--ink); border-color: var(--ink); color: #fff; }
.buy { width: 100%; background: var(--accent); color: #fff; border: 0; border-radius: 8px; padding: 0.6rem; font-weight: 500; font-size: 0.9rem; }
.buy:hover { background: var(--accent-dark); }
.buy:disabled { background: var(--surface); color: var(--muted); }
.nothing { grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--muted); }
.nothing button { margin-top: 0.75rem; }

/* ---- sticky basket bar ---- */
.basket-bar {
  position: fixed; inset-inline: 0; bottom: 0; z-index: 70;
  background: var(--ink); color: #fff;
  display: flex; align-items: center; gap: 1rem;
  padding: 0.7rem clamp(0.85rem, 3vw, 1.75rem);
  transform: translateY(100%); transition: transform 0.25s;
}
.basket-bar.on { transform: none; }
.basket-bar .label { font-size: 0.82rem; color: #b8bcc4; }
.basket-bar .total { font-weight: 700; font-size: 1.1rem; font-variant-numeric: tabular-nums; }
.basket-bar .go { margin-inline-start: auto; background: var(--accent); color: #fff; border: 0; border-radius: 8px; padding: 0.55rem 1.4rem; font-weight: 500; }

/* ---- drawer ---- */
.scrim { position: fixed; inset: 0; background: rgba(20,22,26,0.42); opacity: 0; pointer-events: none; transition: opacity 0.25s; z-index: 80; }
.scrim.on { opacity: 1; pointer-events: auto; }
.basket {
  position: fixed; inset-block: 0; inset-inline-end: 0; z-index: 90;
  width: min(400px, 100%); background: var(--bg);
  transform: translateX(-100%); transition: transform 0.28s cubic-bezier(0.22,1,0.36,1);
  display: flex; flex-direction: column; box-shadow: -8px 0 30px rgba(20,22,26,0.12);
}
.basket.on { transform: none; }
.basket-head { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.1rem; border-bottom: 1px solid var(--line); }
.basket-head h4 { margin: 0; font-size: 1.05rem; font-weight: 500; }
.basket-head button { background: none; border: 0; font-size: 1.1rem; color: var(--muted); }
.basket-body { flex: 1; overflow-y: auto; padding: 1.1rem; display: grid; gap: 0.9rem; align-content: start; }
.row { display: grid; grid-template-columns: 62px 1fr; gap: 0.8rem; border: 1px solid var(--line); border-radius: 10px; padding: 0.6rem; }
.row img { width: 62px; height: 74px; object-fit: cover; border-radius: 6px; }
.row h5 { margin: 0 0 0.15rem; font-size: 0.9rem; font-weight: 500; }
.row small { color: var(--muted); font-size: 0.8rem; }
.row-foot { display: flex; align-items: center; gap: 0.6rem; margin-top: 0.45rem; }
.step { display: inline-flex; align-items: center; border: 1px solid var(--line); border-radius: 7px; }
.step button { background: none; border: 0; padding: 0.2rem 0.55rem; }
.step span { min-width: 1.7rem; text-align: center; font-size: 0.88rem; font-variant-numeric: tabular-nums; }
.row .money { margin-inline-start: auto; font-weight: 500; font-variant-numeric: tabular-nums; }
.toss { background: none; border: 0; color: var(--muted); font-size: 0.8rem; text-decoration: underline; padding: 0; }
.toss:hover { color: #b02a37; }
.basket-foot { border-top: 1px solid var(--line); padding: 1.1rem; display: grid; gap: 0.75rem; }
.sum-line { display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--muted); }
.sum-line.big { color: var(--ink); font-weight: 700; font-size: 1.15rem; }
.sum-line span:last-child { font-variant-numeric: tabular-nums; }
.pay { background: var(--accent); color: #fff; border: 0; border-radius: 9px; padding: 0.8rem; font-weight: 500; font-size: 0.95rem; }
.pay:hover { background: var(--accent-dark); }
.blank { color: var(--muted); text-align: center; padding: 2.5rem 1rem; }

/* ---- footer ---- */
footer { border-top: 1px solid var(--line); background: var(--surface); }
.foot { max-width: 1500px; margin: 0 auto; padding: 1.75rem clamp(0.85rem, 3vw, 1.75rem); display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
.foot h4 { font-size: 0.8rem; margin: 0 0 0.5rem; font-weight: 500; }
.foot ul { list-style: none; padding: 0; margin: 0; }
.foot li, .foot p { color: var(--muted); font-size: 0.85rem; line-height: 1.75; margin: 0; }

.am-toast {
  position: fixed; inset-inline: 0; bottom: 5rem; z-index: 120; margin-inline: auto;
  width: max-content; max-width: calc(100% - 2rem);
  background: var(--ink); color: #fff; border-radius: 8px; padding: 0.6rem 1.1rem; font-size: 0.88rem;
  opacity: 0; transform: translateY(50%); transition: opacity 0.2s, transform 0.2s;
}
.am-toast.on { opacity: 1; transform: none; }
`;

const PAGE_JS = String.raw`
const CART_KEY = 'am-shop-cart';
${CART_JS}

const state = { cats: new Set(), size: 'all', q: '', sort: 'default' };
const pick = {};
const goodsEl = document.getElementById('goods');
const resultCount = document.getElementById('resultCount');

function matches(p) {
  if (state.cats.size && !state.cats.has(p.category)) return false;
  if (state.size !== 'all' && !p.sizes.includes(state.size)) return false;
  if (state.q) {
    const q = state.q.toLowerCase();
    const hay = (p.title + ' ' + p.titleHe + ' ' + p.color + ' ' + p.short).toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function sorted(list) {
  if (state.sort === 'low') return [...list].sort((a, b) => a.price - b.price);
  if (state.sort === 'high') return [...list].sort((a, b) => b.price - a.price);
  return list;
}

function renderGoods() {
  const list = sorted(PRODUCTS.filter(matches));
  resultCount.textContent = list.length + ' מוצרים';
  if (!list.length) {
    goodsEl.innerHTML = '<div class="nothing"><p>לא נמצאו מוצרים.</p><button class="clear" data-act="reset">נקה את כל הסינונים</button></div>';
    return;
  }
  goodsEl.innerHTML = list.map((p) => {
    const size = pick[p.slug] || '';
    return '<article class="good">' +
      '<div class="good-shot">' +
        (p.compareAtPrice ? '<span class="flag save">חיסכון ' + nis(p.compareAtPrice - p.price) + '</span>'
          : p.badge ? '<span class="flag">' + p.badge + '</span>' : '') +
        '<img src="' + p.img + '" alt="' + p.titleHe + '" loading="lazy">' +
      '</div>' +
      '<div class="good-info">' +
        '<h3>' + p.titleHe + '</h3>' +
        '<p class="sub">' + p.title + ' · ' + p.color + '</p>' +
        '<div class="cost"><span class="now">' + nis(p.price) + '</span>' +
          (p.compareAtPrice ? '<span class="was">' + nis(p.compareAtPrice) + '</span>' : '') + '</div>' +
        '<span class="instock">במלאי · משלוח 2–4 ימים</span>' +
        '<div class="size-pick">' + p.sizes.map((s) =>
          '<button data-act="size" data-slug="' + p.slug + '" data-size="' + s + '" aria-pressed="' + (size === s) + '">' + s + '</button>'
        ).join('') + '</div>' +
        '<button class="buy" data-act="add" data-slug="' + p.slug + '"' + (size ? '' : ' disabled') + '>' +
          (size ? 'הוספה לסל · ' + size : 'בחרו מידה') +
        '</button>' +
      '</div>' +
    '</article>';
  }).join('');
}

goodsEl.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const { act, slug, size } = el.dataset;
  if (act === 'size') { pick[slug] = size; renderGoods(); }
  else if (act === 'add' && addToCart(slug, pick[slug], 1)) {
    toast('נוסף לסל · ' + bySlug(slug).titleHe);
    pick[slug] = '';
    renderGoods();
  } else if (act === 'reset') resetFilters();
});

/* ---- filters ---- */
function resetFilters() {
  state.cats.clear();
  state.size = 'all';
  state.q = '';
  state.sort = 'default';
  document.querySelectorAll('.opt input').forEach((i) => { i.checked = false; });
  document.querySelectorAll('#sizeChips button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.size === 'all')));
  document.getElementById('q').value = '';
  document.getElementById('sort').value = 'default';
  renderGoods();
}

document.getElementById('catGroup').addEventListener('change', (e) => {
  const box = e.target.closest('input[data-cat]');
  if (!box) return;
  if (box.checked) state.cats.add(box.dataset.cat);
  else state.cats.delete(box.dataset.cat);
  renderGoods();
});
document.getElementById('sizeChips').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-size]');
  if (!b) return;
  state.size = b.dataset.size;
  document.querySelectorAll('#sizeChips button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.size === state.size)));
  renderGoods();
});
document.getElementById('q').addEventListener('input', (e) => { state.q = e.target.value; renderGoods(); });
document.getElementById('sort').addEventListener('change', (e) => { state.sort = e.target.value; renderGoods(); });
document.getElementById('clearAll').addEventListener('click', resetFilters);

/* ---- basket ---- */
const basket = document.getElementById('basket');
const scrim = document.getElementById('scrim');
const basketBody = document.getElementById('basketBody');
const basketFoot = document.getElementById('basketFoot');
const bar = document.getElementById('bar');

function openBasket() { renderBasket(); basket.classList.add('on'); scrim.classList.add('on'); }
function closeBasket() { basket.classList.remove('on'); scrim.classList.remove('on'); }

function renderBasket() {
  if (!cart.length) {
    basketBody.innerHTML = '<p class="blank">הסל ריק.</p>';
    basketFoot.innerHTML = '';
    return;
  }
  basketBody.innerHTML = cart.map((l) => {
    const key = lineKey(l.slug, l.size);
    return '<div class="row">' +
      '<img src="' + l.img + '" alt="' + l.titleHe + '">' +
      '<div>' +
        '<h5>' + l.titleHe + '</h5>' +
        '<small>' + l.color + ' · מידה ' + l.size + '</small>' +
        '<div class="row-foot">' +
          '<span class="step">' +
            '<button data-c="minus" data-key="' + key + '" aria-label="פחות">−</button>' +
            '<span>' + l.quantity + '</span>' +
            '<button data-c="plus" data-key="' + key + '" aria-label="עוד">+</button>' +
          '</span>' +
          '<button class="toss" data-c="drop" data-key="' + key + '">הסרה</button>' +
          '<span class="money">' + nis(l.price * l.quantity) + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
  const total = cartTotal();
  basketFoot.innerHTML =
    '<div class="sum-line"><span>סכום ביניים</span><span>' + nis(total) + '</span></div>' +
    '<div class="sum-line"><span>משלוח</span><span>' + (total >= 250 ? 'חינם' : nis(29)) + '</span></div>' +
    '<div class="sum-line big"><span>לתשלום</span><span>' + nis(total >= 250 ? total : total + 29) + '</span></div>' +
    '<button class="pay" data-c="pay">מעבר לתשלום</button>';
  paintCartHooks();
}

function onBasketClick(e) {
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
basketBody.addEventListener('click', onBasketClick);
basketFoot.addEventListener('click', onBasketClick);

document.getElementById('cartOpen').addEventListener('click', openBasket);
document.getElementById('barOpen').addEventListener('click', openBasket);
document.getElementById('basketClose').addEventListener('click', closeBasket);
scrim.addEventListener('click', closeBasket);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeBasket(); });

function paintBar() {
  bar.classList.toggle('on', cartCount() > 0);
  if (basket.classList.contains('on')) renderBasket();
}
document.addEventListener('am:cart', paintBar);

renderGoods();
paintCartHooks();
paintBar();
`;

export const shop = {
  id: 'shop',
  file: 'am-shop.html',
  title: 'AM Shop',
  favicon: '🛒',
  description: 'כיוון חנות מהירה ל-AM — רשת מוצרים צפופה, סינון קבוע בצד, הוספה לסל בלחיצה ופס סיכום דביק.',
  build(products) {
    const counts = {};
    for (const p of products) counts[p.category] = (counts[p.category] || 0) + 1;
    const sizes = ['all', ...MEASURES.tees ? Object.keys(MEASURES.tees) : []];

    return [
      '<title>AM Shop</title>',
      fontLink(['Rubik:wght@400;500;700']),
      '<style>' + RESET_CSS + CSS + '</style>',

      '<header class="top"><div class="top-in">',
      '<span class="brand">AM</span>',
      '<div class="search"><input id="q" type="search" placeholder="חיפוש מוצר, צבע או מידה" aria-label="חיפוש"></div>',
      '<button class="top-cart" id="cartOpen">הסל <b data-cart-count>0</b></button>',
      '</div></header>',

      '<div class="page">',

      '<aside class="rail">',
      '<div class="rail-group" id="catGroup">',
      '<h3>קטגוריה</h3>',
      CATEGORIES.filter((c) => c.key !== 'all')
        .map((c) => `<label class="opt"><input type="checkbox" data-cat="${c.key}"><span>${c.he}</span><span class="n">${counts[c.key] || 0}</span></label>`)
        .join(''),
      '</div>',
      '<div class="rail-group">',
      '<h3>מידה</h3>',
      '<div class="chipset" id="sizeChips">',
      sizes.map((s) => `<button data-size="${s}" aria-pressed="${s === 'all'}">${s === 'all' ? 'הכל' : s}</button>`).join(''),
      '</div>',
      '</div>',
      '<div class="rail-group">',
      '<h3>משלוח</h3>',
      '<p style="margin:0;color:var(--muted);font-size:0.85rem;line-height:1.7">משלוח חינם בהזמנה מעל ₪250. מתחת לזה — ₪29.</p>',
      '</div>',
      '<button class="clear" id="clearAll">נקה סינון</button>',
      '</aside>',

      '<main>',
      '<div class="results">',
      '<span class="n" id="resultCount"></span>',
      '<select id="sort" aria-label="מיון">',
      '<option value="default">מיון · מומלץ</option>',
      '<option value="low">מחיר · מהנמוך</option>',
      '<option value="high">מחיר · מהגבוה</option>',
      '</select>',
      '</div>',
      '<div class="goods" id="goods"></div>',
      '</main>',

      '</div>',

      '<footer><div class="foot">',
      '<div><h4>AM Clothing</h4><p>כותנה כבדה, גזרות ישרות, רקמה במקום הדפס. נתפר בישראל.</p></div>',
      '<div><h4>שירות</h4><ul><li>משלוח חינם מעל ₪250</li><li>החזרה תוך 14 יום</li><li>איסוף עצמי בתל אביב</li></ul></div>',
      '<div><h4>עזרה</h4><ul><li>טבלת מידות</li><li>מעקב הזמנה</li><li>צור קשר</li></ul></div>',
      '<div><h4>קשר</h4><ul><li>hello@amclothing.co.il</li><li>@amclothing</li></ul></div>',
      '</div></footer>',

      '<div class="basket-bar" id="bar">',
      '<span class="label"><span data-cart-count>0</span> פריטים בסל</span>',
      '<span class="total" data-cart-total></span>',
      '<button class="go" id="barOpen">צפייה בסל</button>',
      '</div>',

      '<div class="scrim" id="scrim"></div>',
      '<aside class="basket" id="basket" aria-label="סל קניות">',
      '<div class="basket-head"><h4>הסל שלי</h4><button id="basketClose" aria-label="סגירה">✕</button></div>',
      '<div class="basket-body" id="basketBody"></div>',
      '<div class="basket-foot" id="basketFoot"></div>',
      '</aside>',

      '<script>',
      embed('PRODUCTS', products),
      PAGE_JS,
      '</script>'
    ].join('\n');
  }
};
