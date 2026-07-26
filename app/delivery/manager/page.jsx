import Link from 'next/link';
import { isManager } from '../lib/auth';
import { listDeliveries, STATUS } from '../lib/store';
import { listNotifications, NOTIF_TYPE } from '../lib/notifications';
import {
    managerLogoutAction,
    deleteDeliveryAction,
    cancelDeliveryAction,
    markNotificationsReadAction,
    clearNotificationsAction
} from '../actions';
import { formatDateTime, formatDuration } from '../lib/format';
import { ManagerLoginForm } from '../components/manager-login-form';
import { AddDeliveryForm } from '../components/add-delivery-form';
import { StatusBadge } from '../components/status-badge';
import { PhoneLinks } from '../components/phone-links';
import { AutoRefresh } from '../components/auto-refresh';

export const metadata = {
    title: 'מנהל | ניהול משלוחים'
};

export const dynamic = 'force-dynamic';

export default async function ManagerPage({ searchParams }) {
    if (!(await isManager())) {
        return (
            <div className="py-8">
                <ManagerLoginForm />
                <p className="mt-6 text-sm text-center text-white/60">
                    <Link href="/delivery">← חזרה למסך הבחירה</Link>
                </p>
            </div>
        );
    }

    const deliveries = await listDeliveries();
    const notifications = await listNotifications();
    const unreadCount = notifications.filter((n) => !n.read).length;
    const openCount = deliveries.filter(
        (d) => d.status === STATUS.AVAILABLE || d.status === STATUS.PICKED
    ).length;
    const deliveredCount = deliveries.filter((d) => d.status === STATUS.DELIVERED).length;
    const cancelledCount = deliveries.filter((d) => d.status === STATUS.CANCELLED).length;

    // סיכום תשלומים לכל שליח (רק משלוחים שנמסרו)
    const payByCourier = {};
    for (const d of deliveries) {
        if (d.status === STATUS.DELIVERED && d.courierName) {
            if (!payByCourier[d.courierName]) {
                payByCourier[d.courierName] = { count: 0, total: 0 };
            }
            payByCourier[d.courierName].count += 1;
            payByCourier[d.courierName].total += d.payment || 0;
        }
    }
    const courierSummary = Object.entries(payByCourier).sort((a, b) => b[1].total - a[1].total);

    // סינון לפי סטטוס (מגיע מפרמטר ה-URL ?status=...)
    const params = await searchParams;
    const validFilters = ['all', STATUS.AVAILABLE, STATUS.PICKED, STATUS.DELIVERED, STATUS.CANCELLED];
    const activeFilter = validFilters.includes(params?.status) ? params.status : 'all';

    const filterTabs = [
        { key: 'all', label: 'הכל', count: deliveries.length },
        { key: STATUS.AVAILABLE, label: 'זמינים', count: deliveries.filter((d) => d.status === STATUS.AVAILABLE).length },
        { key: STATUS.PICKED, label: 'בדרך', count: deliveries.filter((d) => d.status === STATUS.PICKED).length },
        { key: STATUS.DELIVERED, label: 'נמסרו', count: deliveredCount },
        { key: STATUS.CANCELLED, label: 'בוטלו', count: cancelledCount }
    ];

    const visibleDeliveries =
        activeFilter === 'all' ? deliveries : deliveries.filter((d) => d.status === activeFilter);

    return (
        <div className="flex flex-col gap-8 py-6">
            {/* רענון אוטומטי כדי שהתראות יופיעו בלי רענון ידני */}
            <AutoRefresh seconds={20} />

            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1>
                    👔 לוח מנהל
                    {unreadCount > 0 && (
                        <span className="ml-2 align-middle px-2.5 py-0.5 text-sm font-bold text-primary-content bg-primary rounded-full">
                            🔔 {unreadCount}
                        </span>
                    )}
                </h1>
                <form action={managerLogoutAction}>
                    <button type="submit" className="text-sm underline text-white/70 hover:text-white">
                        התנתקות
                    </button>
                </form>
            </div>

            {/* פאנל התראות */}
            {notifications.length > 0 && (
                <div className="p-5 border rounded-2xl border-white/15 bg-white/5">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <h2>🔔 התראות</h2>
                        <div className="flex items-center gap-4">
                            {unreadCount > 0 && (
                                <form action={markNotificationsReadAction}>
                                    <button type="submit" className="text-sm underline text-white/70 hover:text-white">
                                        סמן הכל כנקרא
                                    </button>
                                </form>
                            )}
                            <form action={clearNotificationsAction}>
                                <button type="submit" className="text-sm underline text-red-400/80 hover:text-red-300">
                                    נקה הכל
                                </button>
                            </form>
                        </div>
                    </div>
                    <ul className="flex flex-col gap-2">
                        {notifications.slice(0, 20).map((n) => (
                            <li
                                key={n.id}
                                className={`flex flex-wrap items-center justify-between gap-2 p-3 text-sm border rounded-xl ${
                                    n.read
                                        ? 'border-white/10 bg-transparent text-white/60'
                                        : 'border-primary/40 bg-primary/10'
                                }`}
                            >
                                <span>
                                    {n.type === NOTIF_TYPE.DELIVERED ? '✅' : '📦'}{' '}
                                    <b>{n.courierName}</b>{' '}
                                    {n.type === NOTIF_TYPE.DELIVERED ? 'מסר את המשלוח' : 'לקח את המשלוח'} ל־
                                    <b>{n.address}</b>
                                    {n.type === NOTIF_TYPE.DELIVERED && <span> ({n.payment} ₪)</span>}
                                </span>
                                <span className="text-xs text-white/50">{formatDateTime(n.createdAt)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <AddDeliveryForm />

            {courierSummary.length > 0 && (
                <div>
                    <h2 className="mb-4">💵 סיכום תשלומים לשליחים</h2>
                    <ul className="flex flex-col gap-2">
                        {courierSummary.map(([name, { count, total }]) => (
                            <li
                                key={name}
                                className="flex flex-wrap items-center justify-between gap-3 p-4 border rounded-2xl border-white/15 bg-white/5"
                            >
                                <span className="font-bold">🛵 {name}</span>
                                <span className="text-sm text-white/70">{count} משלוחים שנמסרו</span>
                                <span className="text-lg font-bold text-green-300">{total} ₪</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h2>📋 המשלוחים</h2>
                    <div className="flex flex-wrap items-center gap-4">
                        <span className="text-sm text-white/70">
                            פתוחים: {openCount} · נמסרו: {deliveredCount}
                            {cancelledCount > 0 && ` · בוטלו: ${cancelledCount}`}
                        </span>
                        {deliveries.length > 0 && (
                            <a
                                href={
                                    activeFilter === 'all'
                                        ? '/delivery/report'
                                        : `/delivery/report?status=${activeFilter}`
                                }
                                className="text-sm no-underline btn btn-sm"
                                download
                            >
                                ⬇️ ייצוא ל-CSV
                            </a>
                        )}
                    </div>
                </div>

                {/* טאבים לסינון לפי סטטוס */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {filterTabs.map((tab) => {
                        const isActive = tab.key === activeFilter;
                        const href = tab.key === 'all' ? '/delivery/manager' : `/delivery/manager?status=${tab.key}`;
                        return (
                            <Link
                                key={tab.key}
                                href={href}
                                className={`px-3 py-1.5 text-sm rounded-full border no-underline transition ${
                                    isActive
                                        ? 'bg-primary text-primary-content border-primary font-bold'
                                        : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
                                }`}
                            >
                                {tab.label} ({tab.count})
                            </Link>
                        );
                    })}
                </div>

                {deliveries.length === 0 ? (
                    <p className="p-6 text-center border rounded-2xl border-white/15 bg-white/5 text-white/60">
                        עדיין אין משלוחים. הוסף משלוח חדש למעלה.
                    </p>
                ) : visibleDeliveries.length === 0 ? (
                    <p className="p-6 text-center border rounded-2xl border-white/15 bg-white/5 text-white/60">
                        אין משלוחים בסטטוס הזה.
                    </p>
                ) : (
                    <ul className="flex flex-col gap-4">
                        {visibleDeliveries.map((d) => (
                            <li
                                key={d.id}
                                className="flex flex-col gap-3 p-5 border rounded-2xl border-white/15 bg-white/5"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-lg font-bold">📍 {d.address}</p>
                                        {d.notes && <p className="text-sm text-white/60">{d.notes}</p>}
                                    </div>
                                    <StatusBadge status={d.status} />
                                </div>

                                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-white/80">
                                    <span>💰 תשלום לשליח: <b>{d.payment} ₪</b></span>
                                    {d.deadline && <span>⏰ עד: {d.deadline}</span>}
                                    {d.courierName && <span>🛵 שליח: {d.courierName}</span>}
                                </div>

                                {d.phone && <PhoneLinks phone={d.phone} />}

                                {/* חותמות זמן */}
                                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/50">
                                    {d.createdAt && <span>🕒 נוצר: {formatDateTime(d.createdAt)}</span>}
                                    {d.pickedAt && <span>📦 נלקח: {formatDateTime(d.pickedAt)}</span>}
                                    {d.deliveredAt && <span>✅ נמסר: {formatDateTime(d.deliveredAt)}</span>}
                                    {d.cancelledAt && <span>❌ בוטל: {formatDateTime(d.cancelledAt)}</span>}
                                    {d.pickedAt && d.deliveredAt && (
                                        <span>⏱️ משך משלוח: {formatDuration(d.pickedAt, d.deliveredAt)}</span>
                                    )}
                                </div>

                                <div className="flex items-center gap-4">
                                    {d.status !== STATUS.DELIVERED && d.status !== STATUS.CANCELLED && (
                                        <form action={cancelDeliveryAction}>
                                            <input type="hidden" name="id" value={d.id} />
                                            <button
                                                type="submit"
                                                className="text-xs underline text-yellow-400/80 hover:text-yellow-300"
                                            >
                                                ביטול משלוח
                                            </button>
                                        </form>
                                    )}
                                    <form action={deleteDeliveryAction}>
                                        <input type="hidden" name="id" value={d.id} />
                                        <button
                                            type="submit"
                                            className="text-xs underline text-red-400/80 hover:text-red-300"
                                        >
                                            מחיקת משלוח
                                        </button>
                                    </form>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
