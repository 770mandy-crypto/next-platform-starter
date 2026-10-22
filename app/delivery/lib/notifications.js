import { getStore } from '@netlify/blobs';

const STORE_NAME = 'notifications';

export const NOTIF_TYPE = {
    PICKED: 'picked', // שליח לקח משלוח
    DELIVERED: 'delivered' // שליח מסר משלוח
};

function notificationsStore() {
    return getStore({ name: STORE_NAME, consistency: 'strong' });
}

function newId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// יצירת התראה חדשה עבור המנהל
export async function addNotification({ type, delivery }) {
    const notif = {
        id: newId(),
        type,
        deliveryId: delivery.id,
        address: delivery.address,
        courierName: delivery.courierName,
        payment: delivery.payment,
        createdAt: Date.now(),
        read: false
    };
    await notificationsStore().setJSON(notif.id, notif);
    return notif;
}

// שליפת כל ההתראות, מהחדש לישן
export async function listNotifications() {
    let data;
    try {
        data = await notificationsStore().list();
    } catch {
        return [];
    }
    const items = await Promise.all(
        data.blobs.map(({ key }) => notificationsStore().get(key, { type: 'json' }))
    );
    return items.filter(Boolean).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

// סימון כל ההתראות כנקראו
export async function markAllRead() {
    const items = await listNotifications();
    await Promise.all(
        items
            .filter((n) => !n.read)
            .map((n) => notificationsStore().setJSON(n.id, { ...n, read: true }))
    );
}

// מחיקת כל ההתראות
export async function clearNotifications() {
    const items = await listNotifications();
    await Promise.all(items.map((n) => notificationsStore().delete(n.id)));
}
