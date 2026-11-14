// Shopping on the owner's behalf, with the owner's approval as the only key.
//
// The agent finds the product and opens a purchase request. Nothing more
// happens until the owner opens the approval link and types their PIN, which
// lives only in the site settings, never in WhatsApp. A stolen phone or a
// forwarded chat is not enough to approve, and the agent itself cannot approve.
// Approval releases the store link; the payment is made in the store, by the
// owner. Card details are never asked for, stored or sent by the agent.
//
// Settings:
//   WHATSAPP_OWNER_NUMBER    the only WhatsApp number that may open requests
//   WHATSAPP_APPROVAL_PIN    6+ digits, typed on the approval page
//   WHATSAPP_MONTHLY_BUDGET  optional, in ₪: requests beyond it are refused

import { createHash, timingSafeEqual } from 'node:crypto';
import * as store from './store.js';
import { isSimulated, outbound } from './outbound.js';

// 89.9 → "89.90", 120 → "120", 1500 → "1,500".
export const formatPrice = (value) =>
    value.toLocaleString('he-IL', Number.isInteger(value) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const siteUrl = () => (process.env.WHATSAPP_PUBLIC_URL || process.env.URL || 'http://localhost:3000').replace(/\/$/, '');
export const approvalUrl = (purchase) => `${siteUrl()}/whatsapp/approve/${purchase.id}/${purchase.token}`;

const ownerNumber = () => (process.env.WHATSAPP_OWNER_NUMBER || '').replace(/\D/g, '');
const monthlyBudget = () => Number(process.env.WHATSAPP_MONTHLY_BUDGET) || null;

export function purchasesConfigured() {
    return /^\d{6,}$/.test(process.env.WHATSAPP_APPROVAL_PIN || '');
}

// The simulator is behind the site's login and moves no money, so it may try
// the flow too; real numbers must be the owner's.
export const mayPurchase = (phone) => isSimulated(phone) || (ownerNumber() !== '' && phone === ownerNumber());

export function safeHttpsUrl(value) {
    try {
        const url = new URL(String(value));
        return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null;
    } catch {
        return null;
    }
}

// Called by the agent's propose_purchase tool. Returns what Claude sees.
export async function proposePurchase(phone, input, now = Date.now()) {
    if (!mayPurchase(phone)) return { error: 'Purchases are available only to the owner of this assistant.' };
    if (!purchasesConfigured()) return { error: 'Purchases are not set up: WHATSAPP_APPROVAL_PIN is missing in the site settings.' };
    const url = safeHttpsUrl(input.url);
    if (!url) return { error: 'The product link must be a full https:// address of the product page.' };
    const priceIls = Math.round(Number(input.price_ils) * 100) / 100;
    if (!(priceIls > 0) || priceIls > 1_000_000) return { error: 'price_ils must be the total price in shekels.' };
    const item = String(input.item ?? '').trim().slice(0, 200);
    if (!item) return { error: 'item is empty.' };

    const budget = monthlyBudget();
    if (budget) {
        const spent = await store.spentThisMonth(phone, now);
        if (spent + priceIls > budget) {
            return { error: `Over the monthly budget: ${spent} of ${budget} ₪ already approved this month; this would add ${priceIls} ₪.` };
        }
    }
    const purchase = await store.createPurchase(phone, {
        item,
        priceIls,
        store: String(input.store ?? '').trim().slice(0, 100) || new URL(url).hostname,
        url,
        notes: String(input.notes ?? '').trim().slice(0, 500)
    });
    return {
        ok: true,
        approval_link: approvalUrl(purchase),
        expires_in_hours: store.PURCHASE_TTL_MS / 3_600_000,
        note: 'Send the person this link. Nothing is bought until they approve it there with their PIN, and they pay in the store themselves.'
    };
}

const digest = (value) => createHash('sha256').update(String(value)).digest();
const pinMatches = (pin) => timingSafeEqual(digest(pin), digest(process.env.WHATSAPP_APPROVAL_PIN || ''));
const tokenMatches = (given, real) => timingSafeEqual(digest(given), digest(real));

export class DecisionError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// What the approval page may show: the request, without its secret token.
export function publicPurchase(p) {
    const { token, phone, attempts, ...rest } = p;
    return { ...rest, host: new URL(p.url).hostname, attemptsLeft: store.MAX_PIN_ATTEMPTS - attempts };
}

export async function loadForApproval(id, token, now = Date.now()) {
    const purchase = await store.getPurchase(id);
    if (!purchase || typeof token !== 'string' || !tokenMatches(token, purchase.token)) return null;
    if (purchase.status === 'pending' && now - purchase.createdAt > store.PURCHASE_TTL_MS) {
        return store.updatePurchase(id, () => ({ status: 'expired' }));
    }
    return purchase;
}

// approve: true or false. Rejecting needs the PIN too, so nobody else can
// cancel the owner's purchases either.
export async function decide({ id, token, pin, approve }, now = Date.now()) {
    const purchase = await loadForApproval(id, token, now);
    if (!purchase) throw new DecisionError('הבקשה לא נמצאה.', 404);
    if (purchase.status !== 'pending') throw new DecisionError(statusText(purchase.status), 409);
    if (!purchasesConfigured()) throw new DecisionError('אישור רכישות לא הוגדר באתר.', 503);
    if (purchase.attempts >= store.MAX_PIN_ATTEMPTS) throw new DecisionError('הבקשה ננעלה אחרי יותר מדי ניסיונות שגויים.', 423);

    if (typeof pin !== 'string' || !pinMatches(pin)) {
        const updated = await store.updatePurchase(id, (p) => {
            const attempts = p.attempts + 1;
            return { attempts, status: attempts >= store.MAX_PIN_ATTEMPTS ? 'locked' : p.status };
        });
        if (updated.status === 'locked') {
            await outbound(purchase.phone).text(`🔒 בקשת הרכישה "${purchase.item}" ננעלה אחרי ${store.MAX_PIN_ATTEMPTS} ניסיונות קוד שגויים. אם לא אתה ניסית, כדאי להחליף את הקוד בהגדרות האתר.`);
            throw new DecisionError('הקוד שגוי. הבקשה ננעלה.', 423);
        }
        throw new DecisionError(`הקוד שגוי. נשארו ${store.MAX_PIN_ATTEMPTS - updated.attempts} ניסיונות.`, 403);
    }

    // Only the first decision counts, even if the page is submitted twice.
    let won = false;
    const decided = await store.updatePurchase(id, (p) => {
        if (p.status !== 'pending') return {};
        won = true;
        return { status: approve ? 'approved' : 'rejected', decidedAt: now };
    });
    if (!won) throw new DecisionError(statusText(decided.status), 409);

    const send = outbound(purchase.phone);
    if (approve) {
        await send.text(`✅ אישרת את הרכישה: *${purchase.item}*, ${formatPrice(purchase.priceIls)} ₪.\nלתשלום בחנות:\n${purchase.url}`);
    } else {
        await send.text(`❌ ביטלת את הרכישה: ${purchase.item}.`);
    }
    await store.appendHistory(purchase.phone, [
        { role: 'assistant', text: approve ? `[the owner approved the purchase of ${purchase.item}]` : `[the owner rejected the purchase of ${purchase.item}]` }
    ]);
    return decided;
}

export function statusText(status) {
    return (
        {
            pending: 'ממתינה לאישור',
            approved: 'הרכישה כבר אושרה.',
            rejected: 'הרכישה בוטלה.',
            expired: 'פג תוקף הבקשה. אפשר לבקש מהעוזר בקשה חדשה.',
            locked: 'הבקשה ננעלה אחרי יותר מדי ניסיונות שגויים.'
        }[status] ?? status
    );
}
