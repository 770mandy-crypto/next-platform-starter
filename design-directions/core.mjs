// Shared material for the four storefront directions: the product data (with
// photos inlined so each page is one portable file) and the cart engine every
// direction drives, whatever it looks like on screen.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const IMAGES = join(HERE, '..', 'public', 'store', 'images');

export const CATEGORIES = [
  { key: 'all', he: 'הכל', en: 'ALL' },
  { key: 'tees', he: 'חולצות', en: 'TEES' },
  { key: 'shorts', he: 'מכנסיים', en: 'SHORTS' },
  { key: 'sets', he: 'סטים', en: 'SETS' }
];

// Fabric facts the technical direction puts on the page as real spec rows.
export const SPECS = {
  tees: { fabric: 'כותנה מסורקת 100%', weight: '240 גר׳/מ״ר', fit: 'גזרה ישרה', wash: '30° הפוך' },
  shorts: { fabric: 'פוטר 80/20 כותנה־פוליאסטר', weight: '320 גר׳/מ״ר', fit: 'ישר, מעל הברך', wash: '30° הפוך' },
  sets: { fabric: 'כותנה מסורקת + פוטר', weight: '240 + 320 גר׳/מ״ר', fit: 'סט מלא', wash: '30° הפוך' }
};

// Chest width / length per size, in cm. Same table the size guide uses.
export const MEASURES = {
  tees: { S: ['48', '68'], M: ['51', '70'], L: ['54', '72'], XL: ['57', '74'], XXL: ['60', '76'] },
  shorts: { S: ['36', '46'], M: ['38', '47'], L: ['40', '48'], XL: ['42', '49'], XXL: ['44', '50'] },
  sets: { S: ['48', '68'], M: ['51', '70'], L: ['54', '72'], XL: ['57', '74'], XXL: ['60', '76'] }
};

export function loadProducts() {
  const catalog = JSON.parse(readFileSync(join(HERE, 'catalog.json'), 'utf8'));
  return catalog.map((p) => ({
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
    img: 'data:image/jpeg;base64,' + readFileSync(join(IMAGES, p.image_file)).toString('base64')
  }));
}

// Escapes the sequences that would otherwise close the script element early.
export function embed(name, value) {
  return `const ${name} = ${JSON.stringify(value).replace(/</g, '\\u003c')};`;
}

// The cart engine. Every direction shares this state and these operations, and
// each one draws its own cart; the only contract is the `am:cart` event and the
// [data-cart-count] / [data-cart-total] hooks.
export const CART_JS = String.raw`
// The artifact wrapper owns the document element, so claim language and
// direction here rather than assuming a markup attribute survived.
document.documentElement.lang = 'he';
document.documentElement.dir = 'rtl';
const nis = (n) => '₪' + new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n);
const lineKey = (slug, size) => slug + '::' + size;
const bySlug = (slug) => PRODUCTS.find((p) => p.slug === slug);

let cart = [];
try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { cart = []; }
if (!Array.isArray(cart)) cart = [];

function persist() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
  document.dispatchEvent(new CustomEvent('am:cart'));
}

function cartCount() { return cart.reduce((t, l) => t + l.quantity, 0); }
function cartTotal() { return cart.reduce((t, l) => t + l.price * l.quantity, 0); }

function addToCart(slug, size, quantity) {
  const p = bySlug(slug);
  if (!p || !size) return false;
  const key = lineKey(slug, size);
  const existing = cart.find((l) => lineKey(l.slug, l.size) === key);
  if (existing) existing.quantity = Math.min(20, existing.quantity + (quantity || 1));
  else cart.push({ slug, size, quantity: quantity || 1, title: p.title, titleHe: p.titleHe, price: p.price, img: p.img, color: p.color });
  persist();
  return true;
}

function setLineQty(key, quantity) {
  const line = cart.find((l) => lineKey(l.slug, l.size) === key);
  if (!line) return;
  if (quantity < 1) cart = cart.filter((l) => lineKey(l.slug, l.size) !== key);
  else line.quantity = Math.min(20, quantity);
  persist();
}

function removeLine(key) {
  cart = cart.filter((l) => lineKey(l.slug, l.size) !== key);
  persist();
}

// Every direction shows the count and the running total somewhere.
function paintCartHooks() {
  const count = cartCount();
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = count;
    el.toggleAttribute('data-empty', count === 0);
  });
  document.querySelectorAll('[data-cart-total]').forEach((el) => { el.textContent = nis(cartTotal()); });
}
document.addEventListener('am:cart', paintCartHooks);

// A short-lived confirmation, positioned by each direction's own CSS.
let toastTimer;
function toast(message) {
  let el = document.querySelector('.am-toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'am-toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 2200);
}
`;

// Google Fonts is the only font host the artifact CSP admits.
export function fontLink(families) {
  return `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${families
    .map((f) => 'family=' + f)
    .join('&')}&display=swap">`;
}

// Shared reset. Each direction paints its own ground on top of this.
export const RESET_CSS = String.raw`
* { box-sizing: border-box; }
body { margin: 0; direction: rtl; -webkit-font-smoothing: antialiased; }
img { max-width: 100%; display: block; }
button, input, select { font: inherit; color: inherit; }
button { cursor: pointer; }
a { color: inherit; }
:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}
`;
