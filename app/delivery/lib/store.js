import { getStore } from '@netlify/blobs';

// שם ה-Store שבו נשמרים כל המשלוחים
const STORE_NAME = 'deliveries';

// סטטוסים אפשריים של משלוח
export const STATUS = {
    AVAILABLE: 'available', // זמין - מחכה לשליח
    PICKED: 'picked', // נלקח - השליח בדרך ללקוח
    DELIVERED: 'delivered' // נמסר - השליח אישר מסירה
};

export const STATUS_LABEL = {
    [STATUS.AVAILABLE]: 'זמין לאיסוף',
    [STATUS.PICKED]: 'נלקח - בדרך ללקוח',
    [STATUS.DELIVERED]: 'נמסר ללקוח'
};

function deliveriesStore() {
    return getStore({ name: STORE_NAME, consistency: 'strong' });
}

// יצירת מזהה ייחודי למשלוח
export function newId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveDelivery(delivery) {
    await deliveriesStore().setJSON(delivery.id, delivery);
    return delivery;
}

export async function getDelivery(id) {
    return await deliveriesStore().get(id, { type: 'json' });
}

export async function deleteDelivery(id) {
    await deliveriesStore().delete(id);
}

// מחזיר את כל המשלוחים, ממויינים מהחדש לישן
export async function listDeliveries() {
    let data;
    try {
        data = await deliveriesStore().list();
    } catch {
        return [];
    }
    const items = await Promise.all(
        data.blobs.map(({ key }) => deliveriesStore().get(key, { type: 'json' }))
    );
    return items
        .filter(Boolean)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}
