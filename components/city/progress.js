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
    return { stage: 0, count: 0, weapons: ['pistol'], cars: [], boats: [], kills: 0, deaths: 0, crates: 0, cash: 0, heists: 0, escapes: 0, arrests: 0 };
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
            arrests: Number(raw.arrests) || 0
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
