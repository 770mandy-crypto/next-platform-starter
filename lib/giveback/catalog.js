// Static reference data shared by the client and the server: what can be
// given away, in what condition, and where. Kept in one place so the search
// filters, the post form and the validation schema can never disagree.

export const CATEGORIES = [
    { id: 'furniture', label: 'רהיטים', emoji: '🛋️' },
    { id: 'toys', label: 'צעצועים', emoji: '🧸' },
    { id: 'books', label: 'ספרים', emoji: '📚' },
    { id: 'home', label: 'ציוד לבית', emoji: '🍳' },
    { id: 'electronics', label: 'חשמל ואלקטרוניקה', emoji: '🔌' },
    { id: 'baby', label: 'תינוקות וילדים', emoji: '🍼' },
    { id: 'clothing', label: 'ביגוד והנעלה', emoji: '👕' },
    { id: 'sports', label: 'ספורט ופנאי', emoji: '⚽' },
    { id: 'garden', label: 'גינה', emoji: '🌱' },
    { id: 'other', label: 'אחר', emoji: '📦' }
];

export const CONDITIONS = [
    { id: 'new', label: 'חדש' },
    { id: 'like-new', label: 'כמו חדש' },
    { id: 'good', label: 'במצב טוב' },
    { id: 'fair', label: 'דורש תיקון קל' }
];

export const STATUSES = {
    available: { label: 'זמין', className: 'bg-green-500/20 text-green-200' },
    reserved: { label: 'שמור למישהו', className: 'bg-yellow-500/20 text-yellow-200' },
    given: { label: 'נמסר', className: 'bg-neutral-500/30 text-neutral-300' }
};

export function categoryById(id) {
    return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function conditionById(id) {
    return CONDITIONS.find((c) => c.id === id);
}

// City centres, used when someone picks a city instead of sharing GPS and as
// the public "area" label. Coordinates are municipal centres, good to roughly
// a kilometre — which is all the public view is ever allowed to reveal anyway.
export const CITIES = [
    { name: 'ירושלים', lat: 31.7683, lng: 35.2137 },
    { name: 'תל אביב-יפו', lat: 32.0853, lng: 34.7818 },
    { name: 'חיפה', lat: 32.794, lng: 34.9896 },
    { name: 'ראשון לציון', lat: 31.973, lng: 34.7925 },
    { name: 'פתח תקווה', lat: 32.084, lng: 34.8878 },
    { name: 'אשדוד', lat: 31.8014, lng: 34.6435 },
    { name: 'נתניה', lat: 32.3215, lng: 34.8532 },
    { name: 'באר שבע', lat: 31.2518, lng: 34.7913 },
    { name: 'בני ברק', lat: 32.0807, lng: 34.8338 },
    { name: 'חולון', lat: 32.0158, lng: 34.7874 },
    { name: 'רמת גן', lat: 32.0684, lng: 34.8248 },
    { name: 'רחובות', lat: 31.8928, lng: 34.8113 },
    { name: 'אשקלון', lat: 31.6688, lng: 34.5743 },
    { name: 'בת ים', lat: 32.0132, lng: 34.748 },
    { name: 'בית שמש', lat: 31.747, lng: 34.9881 },
    { name: 'כפר סבא', lat: 32.175, lng: 34.9069 },
    { name: 'הרצליה', lat: 32.1624, lng: 34.8447 },
    { name: 'חדרה', lat: 32.434, lng: 34.9196 },
    { name: 'מודיעין-מכבים-רעות', lat: 31.898, lng: 35.0104 },
    { name: 'נצרת', lat: 32.6996, lng: 35.3035 },
    { name: 'לוד', lat: 31.951, lng: 34.8881 },
    { name: 'רמלה', lat: 31.9279, lng: 34.8625 },
    { name: 'רעננה', lat: 32.1848, lng: 34.8713 },
    { name: 'ראש העין', lat: 32.0956, lng: 34.9566 },
    { name: 'הוד השרון', lat: 32.15, lng: 34.888 },
    { name: 'גבעתיים', lat: 32.0722, lng: 34.8125 },
    { name: 'קריית אונו', lat: 32.063, lng: 34.855 },
    { name: 'אור יהודה', lat: 32.029, lng: 34.857 },
    { name: 'יבנה', lat: 31.878, lng: 34.739 },
    { name: 'נס ציונה', lat: 31.9293, lng: 34.7987 },
    { name: 'גדרה', lat: 31.812, lng: 34.778 },
    { name: 'קריית גת', lat: 31.61, lng: 34.7642 },
    { name: 'שדרות', lat: 31.525, lng: 34.596 },
    { name: 'נתיבות', lat: 31.421, lng: 34.588 },
    { name: 'אופקים', lat: 31.314, lng: 34.62 },
    { name: 'רהט', lat: 31.393, lng: 34.754 },
    { name: 'דימונה', lat: 31.07, lng: 35.033 },
    { name: 'ערד', lat: 31.259, lng: 35.213 },
    { name: 'אילת', lat: 29.5577, lng: 34.9519 },
    { name: 'מעלה אדומים', lat: 31.777, lng: 35.298 },
    { name: 'מודיעין עילית', lat: 31.933, lng: 35.042 },
    { name: 'זכרון יעקב', lat: 32.571, lng: 34.953 },
    { name: 'יקנעם עילית', lat: 32.659, lng: 35.109 },
    { name: 'עפולה', lat: 32.6078, lng: 35.2897 },
    { name: 'אום אל-פחם', lat: 32.519, lng: 35.153 },
    { name: 'קריית אתא', lat: 32.809, lng: 35.106 },
    { name: 'קריית ביאליק', lat: 32.827, lng: 35.086 },
    { name: 'קריית מוצקין', lat: 32.837, lng: 35.077 },
    { name: 'כרמיאל', lat: 32.919, lng: 35.295 },
    { name: 'נהריה', lat: 33.0059, lng: 35.0941 },
    { name: 'עכו', lat: 32.9281, lng: 35.0818 },
    { name: 'טבריה', lat: 32.7922, lng: 35.5312 },
    { name: 'צפת', lat: 32.9646, lng: 35.496 },
    { name: 'קריית שמונה', lat: 33.207, lng: 35.57 }
];

export function cityByName(name) {
    return CITIES.find((c) => c.name === name);
}
