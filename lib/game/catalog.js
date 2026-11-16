// "Neon City": what the shop sells and the rules for buying and equipping.
// Pure functions over a save object, so the game, the shop and the tests all
// share one set of rules. Coins are earned in the game only; nothing here
// involves real money.

export const WEAPONS = [
    { id: 'laser', name: 'אקדח לייזר', icon: '🔫', price: 0, damage: 1, rate: 3, speed: 900, spread: 0, splash: 0, color: '#22d3ee', blurb: 'הנשק הבסיסי. אמין, לא מרשים.' },
    { id: 'plasma', name: 'רובה פלזמה', icon: '💥', price: 300, damage: 2, rate: 4, speed: 1000, spread: 0, splash: 0, color: '#a855f7', blurb: 'כפול נזק, יורה מהר יותר.' },
    { id: 'lightning', name: 'מקלע ברקים', icon: '⚡', price: 900, damage: 1, rate: 11, speed: 1100, spread: 0.12, splash: 0, color: '#facc15', blurb: 'מטר של יריות. מפזר קצת.' },
    { id: 'rocket', name: 'תותח טילים', icon: '🚀', price: 2000, damage: 6, rate: 1.3, speed: 700, spread: 0, splash: 90, color: '#f97316', blurb: 'איטי, אבל הפיצוץ פוגע בכל מי שקרוב.' }
];

export const CARS = [
    { id: 'beetle', name: 'חיפושית', icon: '🚗', price: 0, maxSpeed: 260, accel: 300, handling: 2.6, health: 100, color: '#38bdf8', blurb: 'מתחילים איפשהו.' },
    { id: 'sport', name: 'מכונית ספורט', icon: '🏎️', price: 400, maxSpeed: 360, accel: 420, handling: 3.1, health: 90, color: '#ef4444', blurb: 'מהירה וחדה, קצת שברירית.' },
    { id: 'jeep', name: "ג'יפ משוריין", icon: '🚙', price: 800, maxSpeed: 290, accel: 330, handling: 2.5, health: 190, color: '#65a30d', blurb: 'סופג כמעט כל דבר.' },
    { id: 'hyper', name: 'מכונית-על', icon: '🏁', price: 2500, maxSpeed: 460, accel: 560, handling: 3.5, health: 140, color: '#f472b6', blurb: 'הכי מהירה בעיר. וגם חזקה.' }
];

export const CHARACTERS = [
    { id: 'rookie', name: 'נהג חדש', icon: '🧑', price: 0, perk: 'בלי יכולת מיוחדת', coinBonus: 1, damageBonus: 1, regen: 0, color: '#e2e8f0' },
    { id: 'mechanic', name: 'המכונאית', icon: '👩‍🔧', price: 350, perk: 'מתקנת את המכונית תוך כדי נסיעה', coinBonus: 1, damageBonus: 1, regen: 4, color: '#fb923c' },
    { id: 'trader', name: 'הסוחר', icon: '🕴️', price: 600, perk: '50% יותר מטבעות', coinBonus: 1.5, damageBonus: 1, regen: 0, color: '#fde047' },
    { id: 'sniper', name: 'הצלפית', icon: '🥷', price: 1200, perk: '35% יותר נזק', coinBonus: 1, damageBonus: 1.35, regen: 0, color: '#4ade80' }
];

export const CATEGORIES = [
    { id: 'weapons', name: 'נשקים', items: WEAPONS },
    { id: 'cars', name: 'מכוניות', items: CARS },
    { id: 'characters', name: 'דמויות', items: CHARACTERS }
];

// Which save slot each category equips into.
const SLOT = { weapons: 'weapon', cars: 'car', characters: 'character' };

export const STARTING_COINS = 100;

export function newSave() {
    return {
        coins: STARTING_COINS,
        owned: { weapons: ['laser'], cars: ['beetle'], characters: ['rookie'] },
        equipped: { weapon: 'laser', car: 'beetle', character: 'rookie' },
        best: 0
    };
}

function findItem(category, id) {
    return CATEGORIES.find((c) => c.id === category)?.items.find((item) => item.id === id) ?? null;
}

// A save read back from storage may be old, partial or edited by hand: keep
// only what makes sense, and fall back to the starting kit for the rest.
export function normalizeSave(raw) {
    const base = newSave();
    if (!raw || typeof raw !== 'object') return base;
    const coins = Number.isFinite(raw.coins) && raw.coins >= 0 ? Math.floor(raw.coins) : base.coins;
    const owned = {};
    for (const { id: category, items } of CATEGORIES) {
        const list = Array.isArray(raw.owned?.[category]) ? raw.owned[category] : [];
        owned[category] = items.filter((item) => item.price === 0 || list.includes(item.id)).map((item) => item.id);
    }
    const equipped = {};
    for (const { id: category } of CATEGORIES) {
        const slot = SLOT[category];
        const wanted = raw.equipped?.[slot];
        equipped[slot] = owned[category].includes(wanted) ? wanted : base.equipped[slot];
    }
    const best = Number.isFinite(raw.best) && raw.best >= 0 ? Math.floor(raw.best) : 0;
    return { coins, owned, equipped, best };
}

export function owns(save, category, id) {
    return save.owned[category]?.includes(id) ?? false;
}

export function isEquipped(save, category, id) {
    return save.equipped[SLOT[category]] === id;
}

// Returns { ok, save, reason }. Buying also equips the item.
export function buy(save, category, id) {
    const item = findItem(category, id);
    if (!item) return { ok: false, save, reason: 'אין פריט כזה.' };
    if (owns(save, category, id)) return { ok: false, save, reason: 'כבר שלך.' };
    if (save.coins < item.price) return { ok: false, save, reason: `חסרים ${item.price - save.coins} מטבעות.` };
    return {
        ok: true,
        save: {
            ...save,
            coins: save.coins - item.price,
            owned: { ...save.owned, [category]: [...save.owned[category], id] },
            equipped: { ...save.equipped, [SLOT[category]]: id }
        }
    };
}

export function equip(save, category, id) {
    if (!owns(save, category, id)) return { ok: false, save, reason: 'צריך לקנות קודם.' };
    return { ok: true, save: { ...save, equipped: { ...save.equipped, [SLOT[category]]: id } } };
}

// Coins collected in a run go straight into the save; the character's coin
// bonus is applied by the game when a coin is picked up.
export function addCoins(save, amount) {
    return { ...save, coins: save.coins + Math.max(0, Math.floor(amount)) };
}

export function recordScore(save, score) {
    return score > save.best ? { ...save, best: Math.floor(score) } : save;
}

// Everything the game needs from the equipped kit, combined.
export function loadout(save) {
    const weapon = findItem('weapons', save.equipped.weapon) ?? WEAPONS[0];
    const car = findItem('cars', save.equipped.car) ?? CARS[0];
    const character = findItem('characters', save.equipped.character) ?? CHARACTERS[0];
    return {
        weapon,
        car,
        character,
        damage: weapon.damage * character.damageBonus,
        coinBonus: character.coinBonus,
        regen: character.regen
    };
}
