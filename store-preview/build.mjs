// Builds a clickable preview of the storefront as one portable file.
//
// It reads the real stylesheet (styles/store.css) and uses the same class names
// the React components do, so what the preview shows is what the deployed site
// shows — minus the parts that need a server: products come from catalog.json
// instead of Supabase, and checkout stops at a notice instead of Stripe.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

const css = readFileSync(join(ROOT, 'styles', 'store.css'), 'utf8');
const catalog = JSON.parse(readFileSync(join(HERE, '..', 'design-directions', 'catalog.json'), 'utf8'));

const products = catalog.map((p) => ({
  slug: p.slug,
  title: p.title,
  titleHe: p.titleHe,
  category: p.category,
  price: p.price,
  compareAtPrice: p.compareAtPrice,
  badge: p.badge,
  short: p.short,
  description: p.description,
  details: p.details,
  color: p.color,
  sizes: p.sizes,
  img:
    'data:image/jpeg;base64,' +
    readFileSync(join(ROOT, 'public', 'store', 'images', p.image_file)).toString('base64')
}));

// Stock per size, so the preview can show the same sold-out and low-stock
// states the real catalogue derives from product_variants.
const STOCK = {
  'am-tee-black': { S: 12, M: 9, L: 15, XL: 4, XXL: 2 },
  'am-tee-white': { S: 7, M: 11, L: 13, XL: 6, XXL: 0 },
  'am-shorts-black': { S: 5, M: 14, L: 10, XL: 8, XXL: 3 },
  'am-shorts-white': { S: 2, M: 6, L: 9, XL: 5, XXL: 1 },
  'am-set-black': { S: 4, M: 8, L: 7, XL: 3, XXL: 2 },
  'am-set-white': { S: 3, M: 5, L: 6, XL: 2, XXL: 0 }
};

const TEE_SIZES = [
  ['S', 48, 68, 20],
  ['M', 51, 70, 21],
  ['L', 54, 72, 22],
  ['XL', 57, 74, 23],
  ['XXL', 60, 76, 24]
];
const SHORT_SIZES = [
  ['S', 36, 46, 30],
  ['M', 38, 47, 31],
  ['L', 40, 48, 32],
  ['XL', 42, 49, 33],
  ['XXL', 44, 50, 34]
];

const embed = (name, value) => `const ${name} = ${JSON.stringify(value).replace(/</g, '\\u003c')};`;

const APP_JS = String.raw`
document.documentElement.lang = 'he';
document.documentElement.dir = 'rtl';

const CART_KEY = 'am-store-preview-cart';
const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const nis = (n) => '₪' + new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n);
const bySlug = (slug) => PRODUCTS.find((p) => p.slug === slug);
const lineKey = (l) => l.slug + '::' + l.size;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------- cart ---------------- */
let cart = [];
try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { cart = []; }
if (!Array.isArray(cart)) cart = [];

function persist() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
  paintChrome();
  if (route().name === 'cart') render();
  if (drawerOpen) renderDrawer();
}

const cartCount = () => cart.reduce((t, l) => t + l.quantity, 0);
const subtotal = () => cart.reduce((t, l) => t + l.price * l.quantity, 0);
const shipping = () => (subtotal() >= 250 || cart.length === 0 ? 0 : 29);

function addLine(slug, size, quantity) {
  const p = bySlug(slug);
  const max = STOCK[slug][size];
  if (!p || !size || !max) return false;
  const key = slug + '::' + size;
  const existing = cart.find((l) => lineKey(l) === key);
  if (existing) existing.quantity = Math.min(max, existing.quantity + quantity);
  else cart.push({ slug, size, quantity: Math.min(max, quantity), title: p.title, titleHe: p.titleHe, price: p.price, img: p.img, color: p.color, max });
  persist();
  openDrawer();
  return true;
}
function setQty(key, quantity) {
  const line = cart.find((l) => lineKey(l) === key);
  if (!line) return;
  if (quantity < 1) cart = cart.filter((l) => lineKey(l) !== key);
  else line.quantity = Math.min(line.max || 20, quantity);
  persist();
}
function dropLine(key) { cart = cart.filter((l) => lineKey(l) !== key); persist(); }

/* ---------------- routing ---------------- */
function route() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('?')[0].split('/').filter(Boolean);
  const query = new URLSearchParams(hash.split('?')[1] || '');
  if (!parts.length) return { name: 'home', query };
  if (parts[0] === 'p') return { name: 'product', slug: parts[1], query };
  return { name: parts[0], query };
}

function go(path) {
  location.hash = path;
}

function setQuery(changes) {
  const r = route();
  const params = new URLSearchParams(r.query);
  for (const [k, v] of Object.entries(changes)) {
    if (!v || v === 'all' || v === 'default') params.delete(k);
    else params.set(k, v);
  }
  const q = params.toString();
  go('/' + (q ? '?' + q : '') );
}

/* ---------------- chrome ---------------- */
function paintChrome() {
  const count = cartCount();
  const badge = document.querySelector('.cart-count');
  badge.textContent = count;
  badge.toggleAttribute('data-empty', count === 0);

  const bar = document.querySelector('.basket-bar');
  const onCartPage = route().name === 'cart';
  bar.classList.toggle('on', count > 0 && !onCartPage);
  bar.querySelector('.bb-label').textContent = count + (count === 1 ? ' פריט בסל' : ' פריטים בסל');
  bar.querySelector('.bb-total').textContent = nis(subtotal());

  const path = route().name;
  document.querySelectorAll('.links a').forEach((a) => {
    a.classList.toggle('current', a.dataset.page === path);
  });
}

/* ---------------- pages ---------------- */
const app = document.getElementById('app');

function render() {
  const r = route();
  const html =
    r.name === 'product' ? productPage(r) :
    r.name === 'cart' ? cartPage() :
    r.name === 'sizes' ? sizesPage() :
    r.name === 'shipping' ? shippingPage() :
    r.name === 'about' ? aboutPage() :
    r.name === 'contact' ? contactPage() :
    homePage(r);
  app.innerHTML = html;
  paintChrome();
  window.scrollTo(0, 0);
}

/* ---- home: rail + grid ---- */
const pick = {};

function homePage(r) {
  const cat = r.query.get('cat') || 'all';
  const size = r.query.get('size') || 'all';
  const q = (r.query.get('q') || '').trim().toLowerCase();
  const sort = r.query.get('sort') || 'default';

  let list = PRODUCTS.filter((p) => {
    if (cat !== 'all' && p.category !== cat) return false;
    if (size !== 'all' && !STOCK[p.slug][size]) return false;
    if (q && !(p.title + ' ' + p.titleHe + ' ' + p.color + ' ' + p.short).toLowerCase().includes(q)) return false;
    return true;
  });
  if (sort === 'low') list = [...list].sort((a, b) => a.price - b.price);
  if (sort === 'high') list = [...list].sort((a, b) => b.price - a.price);

  const countIn = (key) => PRODUCTS.filter((p) => p.category === key).length;
  const dirty = cat !== 'all' || size !== 'all' || q || sort !== 'default';

  const hero =
    '<section class="wrap"><div class="hero">' +
      '<div class="hero-media"><img src="' + PRODUCTS[4].img + '" alt="סט AM שחור"></div>' +
      '<div class="hero-copy">' +
        '<p class="eyebrow">קולקציית הפתיחה · 2026</p>' +
        '<h1>שישה פריטים, <em>בלי עודפים</em></h1>' +
        '<p>כותנה מסורקת כבדה, גזרות שלא מתעוותות בכביסה, ולוגו רקום בזהב. משלוח חינם מעל ₪250.</p>' +
        '<div class="hero-cta">' +
          '<a class="btn-gold" href="#/">לקולקציה</a>' +
          '<a class="btn-line" href="#/sizes">טבלת מידות</a>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="ticker"><div class="ticker-track">' +
      '<span>משלוח <b>חינם</b> מעל ₪250</span>' +
      '<span>החזרה תוך <b>14</b> יום</span>' +
      '<span>כותנה מסורקת <b>240</b> גרם למ״ר</span>' +
      '<span>רקמת זהב, <b>לא</b> הדפס</span>' +
    '</div></div></section>';

  const rail =
    '<aside class="rail">' +
      '<h2 class="rail-title">הקולקציה</h2>' +
      (q ? '<div class="rail-group"><h3>חיפוש</h3><p class="rail-note">תוצאות עבור <strong>' + esc(q) + '</strong></p>' +
        '<button class="rail-clear" data-set="q" data-value="">ניקוי החיפוש</button></div>' : '') +
      '<div class="rail-group"><h3>קטגוריה</h3><div class="filters">' +
        '<button data-set="cat" data-value="all" aria-pressed="' + (cat === 'all') + '">הכל</button>' +
        [['tees', 'חולצות'], ['shorts', 'מכנסיים'], ['sets', 'סטים']].map(([k, label]) =>
          '<button data-set="cat" data-value="' + k + '" aria-pressed="' + (cat === k) + '">' + label + ' (' + countIn(k) + ')</button>'
        ).join('') +
      '</div></div>' +
      '<div class="rail-group"><h3>מידה</h3><div class="filters">' +
        '<button data-set="size" data-value="all" aria-pressed="' + (size === 'all') + '">הכל</button>' +
        SIZES.map((s) => '<button data-set="size" data-value="' + s + '" aria-pressed="' + (size === s) + '">' + s + '</button>').join('') +
      '</div></div>' +
      '<div class="rail-group"><h3>משלוח</h3><p class="rail-note">משלוח חינם בהזמנה מעל ₪250. מתחת לזה — ₪29, 3–5 ימי עסקים.</p></div>' +
      (dirty ? '<button class="rail-clear" data-reset>נקה סינון</button>' : '') +
    '</aside>';

  const results =
    '<div><div class="results-bar">' +
      '<span class="result-count">' + list.length + (list.length === 1 ? ' מוצר' : ' מוצרים') + '</span>' +
      '<select data-sort aria-label="מיון">' +
        [['default', 'מיון · מומלץ'], ['low', 'מחיר · מהנמוך'], ['high', 'מחיר · מהגבוה']].map(([k, label]) =>
          '<option value="' + k + '"' + (sort === k ? ' selected' : '') + '>' + label + '</option>'
        ).join('') +
      '</select>' +
    '</div>' +
    '<div class="grid">' +
      (list.length ? list.map(card).join('') :
        '<p class="empty-state">לא נמצאו מוצרים שתואמים לסינון. <button class="rail-clear" data-reset>נקה סינון</button></p>') +
    '</div></div>';

  return hero + '<section class="wrap catalog-layout" id="catalog">' + rail + results + '</section>';
}

function card(p) {
  const stock = STOCK[p.slug];
  const total = Object.values(stock).reduce((a, b) => a + b, 0);
  const chosen = pick[p.slug] || '';
  const low = chosen && stock[chosen] > 0 && stock[chosen] <= 2;

  const flag = total === 0 ? '<span class="badge">אזל מהמלאי</span>'
    : p.compareAtPrice ? '<span class="badge" style="background:var(--accent)">חיסכון ' + nis(p.compareAtPrice - p.price) + '</span>'
    : p.badge ? '<span class="badge">' + p.badge + '</span>' : '';

  const buy = total === 0
    ? '<button class="qa-open" disabled>אזל מהמלאי</button>'
    : '<div class="qa-panel">' +
        '<span class="qa-label">מידה</span>' +
        '<div class="sizes">' + SIZES.map((s) =>
          '<button data-size="' + s + '" data-slug="' + p.slug + '" aria-pressed="' + (chosen === s) + '"' + (stock[s] ? '' : ' disabled') + '>' + s + '</button>'
        ).join('') + '</div>' +
        (low ? '<p class="low-stock-note">נשארו ' + stock[chosen] + (stock[chosen] === 1 ? ' יחידה' : ' יחידות') + ' במידה ' + chosen + '</p>' : '') +
        '<button class="qa-add" data-add="' + p.slug + '"' + (chosen ? '' : ' disabled') + '>' +
          (chosen ? 'הוספה לסל · ' + chosen : 'בחרו מידה') +
        '</button>' +
      '</div>';

  return '<article class="card">' +
    '<a class="shot" href="#/p/' + p.slug + '">' + flag + '<img src="' + p.img + '" alt="' + esc(p.title) + '" loading="lazy"></a>' +
    '<div class="card-head">' +
      '<h3><a href="#/p/' + p.slug + '">' + p.titleHe + '</a></h3>' +
      '<p class="price">' + (p.compareAtPrice ? '<span class="was">' + nis(p.compareAtPrice) + '</span>' : '') +
        '<span class="now">' + nis(p.price) + '</span></p>' +
    '</div>' +
    '<p class="card-color"><span class="dot" style="background:' + (p.color === 'שחור' ? '#14161a' : '#ffffff') + '"></span>' + p.title + ' · ' + p.color + '</p>' +
    '<p class="short">' + p.short + '</p>' +
    buy +
  '</article>';
}

/* ---- product ---- */
let detailQty = 1;

function productPage(r) {
  const p = bySlug(r.slug);
  if (!p) return '<div class="wrap empty-state">המוצר לא נמצא. <a href="#/">חזרה לקולקציה</a></div>';
  const stock = STOCK[p.slug];
  const chosen = pick[p.slug] || '';
  const siblings = PRODUCTS.filter((x) => x.category === p.category);
  const low = chosen && stock[chosen] > 0 && stock[chosen] <= 2;

  return '<section class="wrap detail-page">' +
    '<nav class="crumbs"><a href="#/">הקולקציה</a> <span>›</span> <a href="#/?cat=' + p.category + '">' +
      ({ tees: 'חולצות', shorts: 'מכנסיים', sets: 'סטים' }[p.category]) + '</a> <span>›</span> <span>' + p.titleHe + '</span></nav>' +
    '<div class="detail-grid">' +
      '<div class="detail-shot"><div class="gallery-container">' +
        '<div class="gallery-main"><img src="' + p.img + '" alt="' + esc(p.title) + '"></div>' +
      '</div></div>' +
      '<div class="detail-side">' +
        '<h1>' + p.titleHe + '</h1>' +
        '<p class="pdp-price">' +
          '<span class="now">' + nis(p.price) + '</span>' +
          (p.compareAtPrice ? '<span class="was">' + nis(p.compareAtPrice) + '</span>' : '') +
        '</p>' +
        '<p class="pdp-desc">' + p.description + '</p>' +
        (siblings.length > 1 ?
          '<div class="pdp-swatches"><span class="size-label">צבע · ' + p.color + '</span><div class="swatch-row">' +
          siblings.map((s) => '<button class="swatch' + (s.slug === p.slug ? ' active' : '') + '" data-go="#/p/' + s.slug + '" ' +
            'style="background:' + (s.color === 'שחור' ? '#14161a' : '#ffffff') + '" aria-label="' + s.color + '"></button>').join('') +
          '</div></div>' : '') +
        '<div class="pdp-row"><span class="size-label" style="margin:0">מידה</span>' +
          '<button class="size-guide-btn" data-go="#/sizes">טבלת מידות</button></div>' +
        '<div class="sizes pdp-sizes">' + SIZES.map((s) =>
          '<button data-size="' + s + '" data-slug="' + p.slug + '" aria-pressed="' + (chosen === s) + '"' + (stock[s] ? '' : ' disabled') + '>' + s + '</button>'
        ).join('') + '</div>' +
        (low ? '<p class="low-stock-note" style="margin-top:0.75rem">נשארו ' + stock[chosen] + (stock[chosen] === 1 ? ' יחידה' : ' יחידות') + ' במידה ' + chosen + '</p>' : '') +
        '<div class="qa-row" style="margin-top:1.25rem">' +
          '<span class="stepper"><button data-q="-1" aria-label="פחות">−</button><span>' + detailQty + '</span><button data-q="1" aria-label="עוד">+</button></span>' +
          '<button class="qa-add" data-add="' + p.slug + '" data-qty' + (chosen ? '' : ' disabled') + '>' +
            (chosen ? 'הוספה לסל · ' + nis(p.price * detailQty) : 'בחרו מידה') +
          '</button>' +
        '</div>' +
        '<ul class="details">' + p.details.map((d) => '<li>' + d + '</li>').join('') + '</ul>' +
        '<div class="trust-bar">' +
          '<span class="trust-item">משלוח חינם מעל ₪250, 3–5 ימי עסקים</span>' +
          '<span class="trust-item">החזרה או החלפה תוך 14 יום</span>' +
          '<span class="trust-item">תשלום מאובטח דרך Stripe</span>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</section>';
}

/* ---- cart ---- */
function cartPage() {
  if (!cart.length) {
    return '<section class="wrap cart-page"><h1>הסל שלי</h1>' +
      '<p class="empty">הסל ריק.<br><a href="#/" style="color:var(--accent)">חזרה לקולקציה</a></p></section>';
  }
  const ship = shipping();
  return '<section class="wrap cart-page"><h1>הסל שלי</h1>' +
    '<div class="catalog-layout">' +
      '<div class="cart-lines">' + cart.map((l) => {
        const key = lineKey(l);
        return '<div class="cart-line">' +
          '<img src="' + l.img + '" alt="' + esc(l.titleHe) + '">' +
          '<div><h3>' + l.titleHe + '</h3>' +
            '<p class="cart-line-meta">' + l.color + ' · מידה ' + l.size + ' · ' + nis(l.price) + ' ליחידה</p>' +
            '<div class="cart-line-actions">' +
              '<span class="stepper">' +
                '<button data-line="' + key + '" data-step="-1" aria-label="פחות">−</button>' +
                '<span>' + l.quantity + '</span>' +
                '<button data-line="' + key + '" data-step="1" aria-label="עוד">+</button>' +
              '</span>' +
              '<button class="cart-line-remove" data-drop="' + key + '">הסרה</button>' +
              '<span class="line-price">' + nis(l.price * l.quantity) + '</span>' +
            '</div>' +
          '</div></div>';
      }).join('') + '</div>' +
      '<aside class="cart-summary">' +
        '<h2>סיכום הזמנה</h2>' +
        '<div class="cart-summary-row"><span>סכום ביניים</span><span>' + nis(subtotal()) + '</span></div>' +
        '<div class="cart-summary-row"><span>משלוח</span><span>' + (ship ? nis(ship) : 'חינם') + '</span></div>' +
        '<div class="grand"><span>לתשלום</span><strong>' + nis(subtotal() + ship) + '</strong></div>' +
        '<button class="btn-gold" data-pay>מעבר לתשלום</button>' +
        '<p class="rail-note">' + (ship ? 'הוסיפו ' + nis(250 - subtotal()) + ' למשלוח חינם.' : 'המשלוח עליכם חינם.') + '</p>' +
      '</aside>' +
    '</div>' +
  '</section>';
}

/* ---- content pages ---- */
function sizesPage() {
  const table = (rows, heads) =>
    '<div class="table-wrap"><table class="size-table"><thead><tr>' +
      heads.map((h) => '<th>' + h + '</th>').join('') +
    '</tr></thead><tbody>' +
      rows.map((r) => '<tr>' + r.map((c, i) => '<td>' + c + (i ? ' ס״מ' : '') + '</td>').join('') + '</tr>').join('') +
    '</tbody></table></div>';

  return '<div class="wrap page-head"><h1>טבלת מידות</h1>' +
    '<p>כל המספרים כאן נמדדו על הפריט עצמו כשהוא שטוח, בסנטימטרים. הדרך הכי מדויקת לבחור: קחו פריט שיושב עליכם טוב, מדדו אותו באותו אופן, והשוו.</p></div>' +
    '<div class="wrap">' +
      '<div class="prose" style="max-width:none"><h2>חולצות</h2></div>' +
      table(TEE_SIZES, ['מידה', 'חצי היקף חזה', 'אורך גוף', 'אורך שרוול']) +
      '<div class="prose" style="max-width:none"><h2>מכנסיים</h2></div>' +
      table(SHORT_SIZES, ['מידה', 'חצי היקף מותן', 'אורך צד', 'חצי היקף ירך']) +
      '<div class="prose"><h2>איך למדוד</h2>' +
        '<p><strong>חזה ומותן</strong> — הניחו את הפריט שטוח ומדדו מקצה לקצה מתחת לבתי השחי. זה חצי היקף; להיקף מלא הכפילו בשתיים.</p>' +
        '<p><strong>אורך גוף</strong> — מנקודת החיבור של הכתף לצוואר ועד לשולי החולצה.</p>' +
        '<p><strong>בין שתי מידות?</strong> הגזרה ישרה ולא צמודה. מראה נקי — קחו את הקטנה; קצת אוויר — הגדולה. החלפת מידה ראשונה על חשבוננו.</p>' +
      '</div>' +
    '</div>';
}

function shippingPage() {
  const cards = [
    ['משלוח חינם', '₪250', 'בהזמנה מעל ₪250 המשלוח על חשבוננו. מתחת לזה — ₪29 לכל הארץ.'],
    ['זמן אספקה', '3–5', 'ימי עסקים מרגע התשלום. הזמנות אחרי 14:00 יוצאות ביום העסקים הבא.'],
    ['החזרה', '14', 'יום להחזרה או החלפה, כל עוד הפריט לא נלבש והתווית עליו.']
  ];
  const faq = [
    ['איך עוקבים אחרי ההזמנה?', 'מיד אחרי התשלום נשלח אישור למייל, וכשהחבילה יוצאת נשלח מספר מעקב. אפשר גם לראות הכל בעמוד החשבון.'],
    ['אפשר לאסוף עצמאית?', 'כן. נקודת איסוף בתל אביב בתיאום מראש, בלי עלות משלוח.'],
    ['איך מחזירים פריט?', 'שלחו מייל עם מספר ההזמנה ומה תרצו להחזיר. ההחזר מבוצע לאותו אמצעי תשלום תוך עד 7 ימי עסקים מרגע שהפריט מגיע.'],
    ['מה אם המידה לא מתאימה?', 'החלפת מידה ראשונה על חשבוננו. לפני ההזמנה כדאי לעבור על טבלת המידות — היא מבוססת על מדידת הפריט עצמו.'],
    ['איך משלמים?', 'דרך Stripe בכרטיס אשראי. פרטי הכרטיס לא עוברים דרכנו ולא נשמרים אצלנו.']
  ];
  return '<div class="wrap page-head"><h1>משלוח והחזרות</h1>' +
    '<p>כל מה שצריך לדעת לפני ואחרי ההזמנה — זמנים, עלויות, ומה קורה אם המידה לא מתאימה.</p></div>' +
    '<div class="wrap"><div class="info-grid">' +
      cards.map(([h, fig, body]) => '<article class="info-card"><h3>' + h + '</h3><span class="figure">' + fig + '</span><p>' + body + '</p></article>').join('') +
    '</div><div class="faq">' +
      faq.map(([q, a], i) => '<details' + (i === 0 ? ' open' : '') + '><summary>' + q + '</summary><p>' + a + '</p></details>').join('') +
    '</div></div>';
}

function aboutPage() {
  const cards = [
    ['הבד', '240', 'גרם למ״ר כותנה מסורקת בחולצות, ו-320 גרם פוטר במכנסיים. בד כבד נופל ישר ולא מתעוות בכביסה.'],
    ['הרקמה', '100%', 'מהלוגואים רקומים בחוט זהב, לא מודפסים. רקמה לא מתקלפת ולא נסדקת אחרי עונה.'],
    ['הקולקציה', '6', 'פריטים בלבד, בסדרות קצרות. כל פריט נבחר כי הוא עובד לבד וגם ביחד עם השאר.']
  ];
  return '<div class="wrap page-head"><h1>המותג</h1>' +
    '<p>AM Clothing נוסד ב-2025 בתל אביב סביב שאלה אחת: מה באמת נשאר בארון אחרי שנה. התשובה הובילה לקולקציה קטנה בכוונה — שני צבעים, שתי גזרות, וסט שמחבר ביניהן.</p></div>' +
    '<div class="wrap"><div class="info-grid">' +
      cards.map(([h, fig, body]) => '<article class="info-card"><h3>' + h + '</h3><span class="figure">' + fig + '</span><p>' + body + '</p></article>').join('') +
    '</div><div class="prose">' +
      '<h2>למה קולקציה כל כך קטנה</h2><p>קל מאוד להוציא ארבעים דגמים ולקוות שמשהו יתפוס. אנחנו עשינו את ההפך: התחלנו משישה פריטים שאנחנו עצמנו לובשים כל שבוע, ורק אחרי שהם עברו עונה שלמה על גופים אמיתיים הוצאנו אותם למכירה.</p>' +
      '<h2>איפה זה נתפר</h2><p>הכל נתפר בישראל, בסדרות קצרות. זה יקר יותר מייצור בחו״ל, אבל זה מאפשר לנו לבדוק כל סדרה לפני שהיא יוצאת ולתקן דברים תוך שבועות במקום תוך עונות.</p>' +
      '<h2>מה הלאה</h2><p>קולקציית 2026 היא הפתיחה. פריט חדש ייכנס רק אם הוא באמת חסר. אם יש משהו שהייתם רוצים לראות, <a href="#/contact">כתבו לנו</a>.</p>' +
    '</div></div>';
}

function contactPage() {
  return '<div class="wrap page-head"><h1>צור קשר</h1>' +
    '<p>שאלה על מידה, על הזמנה קיימת, או משהו שהייתם רוצים לראות בקולקציה — אנחנו עונים לכל פנייה.</p></div>' +
    '<div class="wrap"><div class="info-grid">' +
      '<article class="info-card"><h3>מייל</h3><p><span dir="ltr">hello@amclothing.co.il</span><br>תשובה תוך יום עסקים אחד.</p></article>' +
      '<article class="info-card"><h3>אינסטגרם</h3><p><span dir="ltr">@am.clothing</span><br>הדרך הכי מהירה לשאלה קצרה.</p></article>' +
      '<article class="info-card"><h3>איסוף עצמי</h3><p>תל אביב, בתיאום מראש.<br>בלי עלות משלוח.</p></article>' +
    '</div><div class="prose">' +
      '<h2>לפני שכותבים</h2><p>הרבה שאלות כבר מכוסות: זמני משלוח ועלויות ב<a href="#/shipping">משלוח והחזרות</a>, ומידות מדויקות ב<a href="#/sizes">טבלת המידות</a>.</p>' +
      '<h2>פנייה על הזמנה קיימת</h2><p>כדי שנוכל לעזור מהר, צרפו את מספר ההזמנה ואת מה שתרצו לשנות. אם מדובר בהחזרה או החלפה, ציינו גם את הפריט והמידה.</p>' +
    '</div></div>';
}

/* ---------------- drawer ---------------- */
let drawerOpen = false;
const drawer = document.querySelector('.drawer');
const scrim = document.querySelector('.scrim');

function openDrawer() { drawerOpen = true; drawer.classList.add('on'); scrim.classList.add('on'); renderDrawer(); }
function closeDrawer() { drawerOpen = false; drawer.classList.remove('on'); scrim.classList.remove('on'); }

function renderDrawer() {
  const body = drawer.querySelector('.drawer-body');
  const foot = drawer.querySelector('.drawer-foot');
  if (!cart.length) {
    body.innerHTML = '<p class="empty">הסל ריק.<br>בחרו פריט מהקולקציה כדי להתחיל.</p>';
    foot.innerHTML = '';
    return;
  }
  body.innerHTML = cart.map((l) => {
    const key = lineKey(l);
    return '<div class="line">' +
      '<img src="' + l.img + '" alt="' + esc(l.titleHe) + '">' +
      '<div class="line-info"><h4>' + l.titleHe + '</h4>' +
        '<p class="vari">' + l.color + ' · מידה ' + l.size + '</p>' +
        '<div class="line-foot">' +
          '<span class="stepper">' +
            '<button data-line="' + key + '" data-step="-1" aria-label="פחות">−</button>' +
            '<span>' + l.quantity + '</span>' +
            '<button data-line="' + key + '" data-step="1" aria-label="עוד">+</button>' +
          '</span>' +
          '<button class="line-rm" data-drop="' + key + '">הסרה</button>' +
          '<span class="line-price">' + nis(l.price * l.quantity) + '</span>' +
        '</div>' +
      '</div></div>';
  }).join('');
  const ship = shipping();
  foot.innerHTML =
    '<div class="totals"><span>סכום ביניים</span><span class="total">' + nis(subtotal()) + '</span></div>' +
    '<div class="totals"><span>משלוח</span><span class="total">' + (ship ? nis(ship) : 'חינם') + '</span></div>' +
    '<div class="grand"><span>לתשלום</span><strong>' + nis(subtotal() + ship) + '</strong></div>' +
    '<button class="btn-gold" data-go="#/cart">לעמוד הסל</button>';
}

/* ---------------- events ---------------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-set],[data-reset],[data-size],[data-add],[data-q],[data-line],[data-drop],[data-go],[data-pay],[data-close-drawer],[data-open-drawer]');
  if (!el) return;

  if (el.dataset.go !== undefined) { e.preventDefault(); closeDrawer(); go(el.dataset.go.replace(/^#/, '')); return; }
  if (el.hasAttribute('data-open-drawer')) { openDrawer(); return; }
  if (el.hasAttribute('data-close-drawer')) { closeDrawer(); return; }
  if (el.dataset.set !== undefined) { setQuery({ [el.dataset.set]: el.dataset.value }); return; }
  if (el.hasAttribute('data-reset')) { go('/'); return; }
  if (el.hasAttribute('data-pay')) { alert('זו תצוגה מקדימה. התשלום דרך Stripe פעיל באתר החי.'); return; }

  if (el.dataset.size) { pick[el.dataset.slug] = el.dataset.size; detailQty = 1; render(); return; }
  if (el.dataset.q) { detailQty = Math.max(1, detailQty + Number(el.dataset.q)); render(); return; }
  if (el.dataset.add) {
    const slug = el.dataset.add;
    const qty = el.hasAttribute('data-qty') ? detailQty : 1;
    if (addLine(slug, pick[slug], qty)) { pick[slug] = ''; detailQty = 1; render(); }
    return;
  }
  if (el.dataset.line) {
    const line = cart.find((l) => lineKey(l) === el.dataset.line);
    if (line) setQty(el.dataset.line, line.quantity + Number(el.dataset.step));
    return;
  }
  if (el.dataset.drop) { dropLine(el.dataset.drop); return; }
});

document.addEventListener('change', (e) => {
  if (e.target.matches('[data-sort]')) setQuery({ sort: e.target.value });
});

document.querySelector('.head-search input').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const q = e.target.value.trim();
  go('/' + (q ? '?q=' + encodeURIComponent(q) : ''));
});

scrim.addEventListener('click', closeDrawer);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
window.addEventListener('hashchange', render);

render();
`;

const html = [
  '<title>AM Clothing</title>',
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap">',
  '<style>' + css + '</style>',

  '<div class="store-app">',
  '<header><div class="wrap bar">',
  '<a class="mark" href="#/"><span class="vs">AM</span><span class="name">CLOTHING</span></a>',
  '<form class="head-search" role="search" onsubmit="return false"><input type="search" placeholder="חיפוש מוצר, צבע או מידה" aria-label="חיפוש בחנות"></form>',
  '<nav class="links">',
  '<a href="#/" data-page="home">הקולקציה</a>',
  '<a href="#/?cat=tees">חולצות</a>',
  '<a href="#/?cat=shorts">מכנסיים</a>',
  '<a href="#/?cat=sets">סטים</a>',
  '<a href="#/sizes" data-page="sizes">טבלת מידות</a>',
  '<a href="#/shipping" data-page="shipping">משלוח והחזרות</a>',
  '<a href="#/about" data-page="about">עלינו</a>',
  '</nav>',
  '<div class="icon-cluster">',
  '<a class="icon-link" href="#/contact"><span class="icon-link-label">צור קשר</span></a>',
  '<button class="icon-link cart-btn" data-open-drawer aria-label="סל הקניות"><span class="icon-link-label">הסל</span><span class="cart-count" data-empty>0</span></button>',
  '</div>',
  '</div></header>',

  '<main id="app"></main>',

  '<footer><div class="wrap"><div class="foot-grid">',
  '<div><a class="mark" href="#/"><span class="vs">AM</span><span class="name">CLOTHING</span></a>',
  '<p style="margin-top:0.9rem">כותנה כבדה, גזרות ישרות ורקמת זהב במקום הדפס. קולקציית פתיחה בסדרה מוגבלת, נתפרת בישראל.</p></div>',
  '<div><h5>הקולקציה</h5><ul><li><a href="#/?cat=tees">חולצות</a></li><li><a href="#/?cat=shorts">מכנסיים</a></li><li><a href="#/?cat=sets">סטים</a></li><li><a href="#/">כל המוצרים</a></li></ul></div>',
  '<div><h5>מידע</h5><ul><li><a href="#/about">עלינו</a></li><li><a href="#/sizes">טבלת מידות</a></li><li><a href="#/shipping">משלוח והחזרות</a></li><li><a href="#/contact">צור קשר</a></li></ul></div>',
  '<div><h5>החשבון</h5><ul><li><a href="#/cart">הסל שלי</a></li></ul></div>',
  '<div><h5>יצירת קשר</h5><ul><li><span dir="ltr">hello@amclothing.co.il</span></li><li><span dir="ltr">@am.clothing</span></li><li>משלוח חינם מעל ₪250</li></ul></div>',
  '</div><div class="foot-rule"><span>© AM CLOTHING 2026</span><span>ALL RIGHTS RESERVED</span></div></div></footer>',

  '<div class="scrim"></div>',
  '<aside class="drawer" aria-label="סל קניות">',
  '<div class="drawer-head"><h2>הסל שלי</h2><button class="qa-close" data-close-drawer aria-label="סגירה">✕</button></div>',
  '<div class="drawer-body"></div><div class="drawer-foot"></div>',
  '</aside>',

  '<div class="basket-bar"><span class="bb-label"></span><span class="bb-total"></span>',
  '<button class="bb-go" data-open-drawer>צפייה בסל</button></div>',
  '</div>',

  '<script>',
  embed('PRODUCTS', products),
  embed('STOCK', STOCK),
  embed('TEE_SIZES', TEE_SIZES),
  embed('SHORT_SIZES', SHORT_SIZES),
  APP_JS,
  '</script>'
].join('\n');

if (/<!DOCTYPE|<html[\s>]|<head>|<body>/i.test(html)) throw new Error('page carries document tags');

const js = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
const probe = join(tmpdir(), 'store-preview-probe.js');
writeFileSync(probe, js);
execFileSync(process.execPath, ['--check', probe]);

const out = join(HERE, 'am-store-preview.html');
writeFileSync(out, html);
console.log('written', (html.length / 1024).toFixed(0) + 'KB →', out);
