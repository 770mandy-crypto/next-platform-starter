import { WEAPONS } from './combat.js';
// Stages and rewards. A stage is finished by game events (reaching a place,
// collecting, driving, sailing, winning fights) and unlocks a weapon, a car or
// a boat. Pure functions over a plain state object, saved to localStorage.

export const STAGES = [
    { title: 'טפסו לפסגת גבעת המדרגות', event: 'summit', kind: 'reach', min: 1, reward: { type: 'weapon', id: 'smg', label: 'תת־מקלע ומסוק' } },
    { title: 'היכנסו לבניין ועלו במעלית לקומה 5', event: 'floor', kind: 'reach', min: 5, reward: { type: 'cash', id: 'bonus', amount: 5000, label: 'מענק של 5,000 ₪' } },
    { title: 'אספו 5 ארגזי ציוד מהקומות', event: 'crate', kind: 'count', need: 5, reward: { type: 'boat', id: 'motor', label: 'סירת מנוע' } },
    { title: 'הגיעו לגג של בניין בן 15 קומות ומעלה', event: 'roof', kind: 'reach', min: 15, reward: { type: 'weapon', id: 'shotgun', label: 'רובה ציד' } },
    { title: 'שוטו 300 מטר בסירה או באונייה', event: 'sail', kind: 'count', need: 300, reward: { type: 'boat', id: 'speed', label: 'סירת מרוץ' } },
    { title: 'נהגו קילומטר אחד ברחובות העיר', event: 'drive', kind: 'count', need: 1000, reward: { type: 'cash', id: 'bonus', amount: 10000, label: 'מענק של 10,000 ₪' } },
    { title: 'עלו לקומה 20', event: 'floor', kind: 'reach', min: 20, reward: { type: 'weapon', id: 'sniper', label: 'רובה צלפים' } },
    { title: 'אספו 20 ארגזי ציוד', event: 'crate', kind: 'count', need: 20, reward: { type: 'weapon', id: 'rifle', label: 'רובה סער' } },
    { title: 'פרצו 3 כספות בעסקים בעיר', event: 'heist', kind: 'count', need: 3, reward: { type: 'cash', id: 'bonus', amount: 20000, label: 'מענק של 20,000 ₪' } },
    { title: 'ברחו מהמשטרה ברמת חיפוש של 3 כוכבים ומעלה', event: 'escape', kind: 'reach', min: 3, reward: { type: 'cash', id: 'bonus', amount: 25000, label: 'מענק של 25,000 ₪' } }
];

export const STORAGE_KEY = 'city-game-v2';

export function initialProgress() {
    return { stage: 0, count: 0, weapons: ['pistol'], cars: [], boats: [], kills: 0, deaths: 0, crates: 0, cash: 0, heists: 0, escapes: 0, arrests: 0, costumes: ['default'], costume: 'default' };
}

/** The current stage as the player sees it, depending on whether bots are on. */
export function currentStage(state, bots) {
    const s = STAGES[state.stage];
    if (!s) return null;
    return !bots && s.peaceful ? { ...s, ...s.peaceful } : s;
}

function grant(state, reward) {
    if (reward.type === 'cash') return { ...state, cash: state.cash + reward.amount };
    const key = reward.type === 'weapon' ? 'weapons' : reward.type === 'car' ? 'cars' : 'boats';
    return state[key].includes(reward.id) ? state : { ...state, [key]: [...state[key], reward.id] };
}

/**
 * Feed a game event into the progress. Returns { state, completed }, where
 * completed is the stage that this event just finished (or null).
 */
export function applyEvent(state, event, value = 1, bots = true) {
    let next = state;
    if (event === 'kill') next = { ...next, kills: next.kills + 1 };
    if (event === 'death') next = { ...next, deaths: next.deaths + 1 };
    if (event === 'crate') next = { ...next, crates: next.crates + 1 };
    if (event === 'heist') next = { ...next, heists: next.heists + 1 };
    if (event === 'escape') next = { ...next, escapes: next.escapes + 1 };
    if (event === 'arrest') next = { ...next, arrests: next.arrests + 1 };
    if (event === 'weapon' && !next.weapons.includes(value)) next = { ...next, weapons: [...next.weapons, value] };
    const stage = currentStage(next, bots);
    if (!stage || stage.event !== event) return { state: next, completed: null };
    let done;
    if (stage.kind === 'reach') done = value >= stage.min;
    else {
        next = { ...next, count: Math.min(stage.need, next.count + value) };
        done = next.count >= stage.need;
    }
    if (!done) return { state: next, completed: null };
    return { state: { ...grant(next, stage.reward), stage: next.stage + 1, count: 0 }, completed: stage };
}

/** What the stage panel shows. */
export function stageView(state, bots) {
    const s = currentStage(state, bots);
    if (!s) return { index: STAGES.length, total: STAGES.length, title: 'כל השלבים הושלמו!', done: true, progress: 0, need: 0, reward: '' };
    const count = s.kind === 'count';
    return { index: state.stage + 1, total: STAGES.length, title: s.title, done: false, progress: count ? Math.floor(state.count) : 0, need: count ? s.need : 0, reward: s.reward.label };
}

export function loadProgress(storage) {
    try {
        const raw = JSON.parse(storage.getItem(STORAGE_KEY));
        if (!raw || typeof raw.stage !== 'number') return initialProgress();
        const base = initialProgress();
        const list = (v, d) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : d);
        return {
            ...base,
            stage: Math.max(0, Math.min(STAGES.length, Math.floor(raw.stage))),
            count: Number(raw.count) || 0,
            weapons: [...new Set(['pistol', ...list(raw.weapons, [])])],
            cars: list(raw.cars, []),
            boats: list(raw.boats, []),
            kills: Number(raw.kills) || 0,
            deaths: Number(raw.deaths) || 0,
            crates: Number(raw.crates) || 0,
            cash: Math.max(0, Math.floor(Number(raw.cash) || 0)),
            heists: Number(raw.heists) || 0,
            escapes: Number(raw.escapes) || 0,
            arrests: Number(raw.arrests) || 0,
            costumes: [...new Set(['default', ...list(raw.costumes, [])])],
            costume: COSTUMES[raw.costume] ? raw.costume : 'default'
        };
    } catch {
        return initialProgress();
    }
}

export function saveProgress(storage, state) {
    try {
        storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Private windows and blocked storage: the game simply does not remember.
    }
}

/** Add (or with a negative amount, take) money; never below zero. */
export function addCash(state, amount) {
    return { ...state, cash: Math.max(0, Math.round(state.cash + amount)) };
}

/** The helicopter opens once the first stage is done (that is, from stage 2). */
export const heliUnlocked = (state) => state.stage >= 1;

/** Looks for the player: the colours of the clothes. */
export const COSTUMES = {
    default: { label: 'ברירת מחדל', shirt: '#dfc184', pants: '#22303c' },
    suit: { label: 'חליפה', shirt: '#f0ede4', pants: '#1b2430', vest: '#20262e', hair: '#1b1b1f' },
    ranger: { label: 'שומר פארק', shirt: '#5d6b3a', pants: '#3a3327', hat: '#4a4a3a', hair: '#4a3420' },
    shadow: { label: 'צללים', shirt: '#15161a', pants: '#0c0d10', hat: '#0c0d10', hair: '#0c0d10', vest: '#23252b' }
};

const AMMO = ['pistol', 'smg', 'shotgun', 'rifle', 'sniper'].map((id) => ({
    kind: 'ammo', id, name: `תחמושת ל${WEAPONS[id].name}`, price: WEAPONS[id].mag * 20, detail: `${WEAPONS[id].mag * 3} כדורים נוספים`
}));

/** Everything the shop sells, with prices in the game's cash. */
export const CATALOG = [
    { kind: 'weapon', id: 'smg', name: 'תת־מקלע', price: 2500, detail: 'ירי רצוף, מחסנית של 30 כדורים' },
    { kind: 'weapon', id: 'shotgun', name: 'רובה ציד', price: 6000, detail: 'פיזור של 8 כדורים, טווח קצר' },
    { kind: 'weapon', id: 'rifle', name: 'רובה סער', price: 14000, detail: 'ירי רצוף, טווח ארוך' },
    { kind: 'weapon', id: 'sniper', name: 'רובה צלפים', price: 22000, detail: 'נזק גבוה מאוד, דיוק מרבי' },
    ...AMMO,
    { kind: 'car', id: 'sport', name: 'מכונית ספורט', price: 30000, detail: 'עד 155 קמ״ש' },
    { kind: 'car', id: 'jeep', name: 'ג׳יפ משוריין', price: 20000, detail: 'שריון כבד, חוסם יריות' },
    { kind: 'car', id: 'super', name: 'מכונית על', price: 80000, detail: 'המהירה ביותר בעיר, עד 194 קמ״ש' },
    { kind: 'costume', id: 'default', name: 'ברירת מחדל', price: 0, detail: 'הלבוש המקורי שלכם' },
    { kind: 'costume', id: 'suit', name: 'חליפה', price: 4000, detail: 'מראה של איש עסקים' },
    { kind: 'costume', id: 'ranger', name: 'שומר פארק', price: 8000, detail: 'מדי שומר וכובע רחב' },
    { kind: 'costume', id: 'shadow', name: 'צללים', price: 15000, detail: 'שחור מוחלט וכובע כהה' }
];

function ownedHere(state, item) {
    if (item.kind === 'weapon') return state.weapons.includes(item.id);
    if (item.kind === 'car') return state.cars.includes(item.id);
    if (item.kind === 'costume') return state.costumes.includes(item.id);
    return false;
}

/** The shop as the player sees it right now. Ammo needs the gun first. */
export function shopList(state, free = false) {
    return CATALOG.map((item) => {
        const owned = ownedHere(state, item);
        const price = free ? 0 : item.price;
        const canBuy = item.kind === 'ammo' ? state.weapons.includes(item.id) && (free || state.cash >= price)
            : item.kind === 'costume' && owned ? true
                : !owned && (free || state.cash >= price);
        return { ...item, owned, price, canBuy, equipped: item.kind === 'costume' && state.costume === item.id };
    });
}

/** Buy one item (or put on an owned look). Returns the new state and a message for the player. */
export function buyItem(state, kind, id, free = false) {
    const item = CATALOG.find((i) => i.kind === kind && i.id === id);
    if (!item) return { state, ok: false, message: 'הפריט לא קיים' };
    const owned = ownedHere(state, item);
    if (item.kind === 'costume' && owned) return { state: { ...state, costume: id }, ok: true, message: `לבשתם: ${item.name}` };
    if (item.kind === 'ammo' && !state.weapons.includes(id)) return { state, ok: false, message: 'קודם קנו את הנשק' };
    if (item.kind !== 'ammo' && owned) return { state, ok: false, message: 'כבר בבעלותכם' };
    const price = free ? 0 : item.price;
    if (state.cash < price) return { state, ok: false, message: 'אין מספיק כסף' };
    let next = { ...state, cash: state.cash - price };
    if (item.kind === 'weapon') next = { ...next, weapons: [...state.weapons, id] };
    if (item.kind === 'car') next = { ...next, cars: [...state.cars, id] };
    if (item.kind === 'costume') next = { ...next, costumes: [...state.costumes, id], costume: id };
    return { state: next, ok: true, message: `נרכש: ${item.name}` };
}
