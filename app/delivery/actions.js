'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
    STATUS,
    newId,
    saveDelivery,
    getDelivery,
    deleteDelivery,
    listDeliveries
} from './lib/store';
import {
    MANAGER_PASSWORD,
    isManager,
    setManagerCookie,
    clearManagerCookie,
    getCourierName,
    setCourierCookie,
    clearCourierCookie
} from './lib/auth';
import { NOTIF_TYPE, addNotification, markAllRead, clearNotifications } from './lib/notifications';

/* ---------- כניסות ---------- */

// כניסת מנהל עם סיסמה
export async function managerLoginAction(prevState, formData) {
    const password = String(formData.get('password') || '');
    if (password !== MANAGER_PASSWORD) {
        return { error: 'סיסמה שגויה, נסה שוב' };
    }
    await setManagerCookie();
    redirect('/delivery/manager');
}

export async function managerLogoutAction() {
    await clearManagerCookie();
    redirect('/delivery');
}

// כניסת שליח - רק מזינים שם, כל אחד יכול להיכנס
export async function courierLoginAction(prevState, formData) {
    const name = String(formData.get('name') || '').trim();
    if (!name) {
        return { error: 'נא להזין שם' };
    }
    await setCourierCookie(name);
    redirect('/delivery/courier');
}

export async function courierLogoutAction() {
    await clearCourierCookie();
    redirect('/delivery');
}

/* ---------- פעולות מנהל ---------- */

// הוספת משלוח חדש
export async function addDeliveryAction(prevState, formData) {
    if (!(await isManager())) {
        return { error: 'אין הרשאה' };
    }

    const address = String(formData.get('address') || '').trim();
    const payment = Number(formData.get('payment') || 0);
    const deadline = String(formData.get('deadline') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const notes = String(formData.get('notes') || '').trim();

    if (!address) {
        return { error: 'חובה להזין כתובת למשלוח' };
    }
    if (!payment || payment <= 0) {
        return { error: 'חובה להזין סכום תשלום לשליח' };
    }

    const delivery = {
        id: newId(),
        address,
        payment,
        deadline, // עד מתי אפשר לקחת את המשלוח (טקסט חופשי / תאריך)
        phone, // טלפון הלקוח
        notes,
        status: STATUS.AVAILABLE,
        courierName: null,
        createdAt: Date.now(),
        pickedAt: null,
        deliveredAt: null,
        cancelledAt: null
    };

    await saveDelivery(delivery);
    revalidatePath('/delivery/manager');
    revalidatePath('/delivery/courier');
    return { success: 'המשלוח נוסף בהצלחה' };
}

// מחיקת משלוח (מנהל בלבד)
export async function deleteDeliveryAction(formData) {
    if (!(await isManager())) return;
    const id = String(formData.get('id') || '');
    if (id) await deleteDelivery(id);
    revalidatePath('/delivery/manager');
    revalidatePath('/delivery/courier');
}

// ביטול משלוח (מנהל בלבד) - אפשרי כל עוד לא נמסר
export async function cancelDeliveryAction(formData) {
    if (!(await isManager())) return;
    const id = String(formData.get('id') || '');
    if (!id) return;

    const delivery = await getDelivery(id);
    if (!delivery || delivery.status === STATUS.DELIVERED || delivery.status === STATUS.CANCELLED) {
        return;
    }

    delivery.status = STATUS.CANCELLED;
    delivery.cancelledAt = Date.now();
    await saveDelivery(delivery);

    revalidatePath('/delivery/manager');
    revalidatePath('/delivery/courier');
}

/* ---------- פעולות שליח ---------- */

// שליח לוקח משלוח
export async function takeDeliveryAction(formData) {
    const id = String(formData.get('id') || '');
    const courierName = await getCourierName();
    if (!courierName || !id) return;

    const delivery = await getDelivery(id);
    if (!delivery || delivery.status !== STATUS.AVAILABLE) return;

    delivery.status = STATUS.PICKED;
    delivery.courierName = courierName;
    delivery.pickedAt = Date.now();
    await saveDelivery(delivery);
    await addNotification({ type: NOTIF_TYPE.PICKED, delivery });

    revalidatePath('/delivery/courier');
    revalidatePath('/delivery/manager');
}

// שליח מאשר שהמשלוח נמסר ללקוח
export async function confirmDeliveryAction(formData) {
    const id = String(formData.get('id') || '');
    const courierName = await getCourierName();
    if (!courierName || !id) return;

    const delivery = await getDelivery(id);
    if (!delivery || delivery.status !== STATUS.PICKED) return;
    if (delivery.courierName !== courierName) return; // רק השליח שלקח יכול לאשר

    delivery.status = STATUS.DELIVERED;
    delivery.deliveredAt = Date.now();
    await saveDelivery(delivery);
    await addNotification({ type: NOTIF_TYPE.DELIVERED, delivery });

    revalidatePath('/delivery/courier');
    revalidatePath('/delivery/manager');
}

/* ---------- התראות (מנהל) ---------- */

// סימון כל ההתראות כנקראו
export async function markNotificationsReadAction() {
    if (!(await isManager())) return;
    await markAllRead();
    revalidatePath('/delivery/manager');
}

// מחיקת כל ההתראות
export async function clearNotificationsAction() {
    if (!(await isManager())) return;
    await clearNotifications();
    revalidatePath('/delivery/manager');
}

// עזר: שליפת כל המשלוחים
export async function getAllDeliveries() {
    return await listDeliveries();
}
