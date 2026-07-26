import Link from 'next/link';
import { isManager } from '../lib/auth';
import { listDeliveries, STATUS } from '../lib/store';
import { managerLogoutAction, deleteDeliveryAction, cancelDeliveryAction } from '../actions';
import { formatDateTime, formatDuration } from '../lib/format';
import { ManagerLoginForm } from '../components/manager-login-form';
import { AddDeliveryForm } from '../components/add-delivery-form';
import { StatusBadge } from '../components/status-badge';
import { PhoneLinks } from '../components/phone-links';

export const metadata = {
    title: 'מנהל | ניהול משלוחים'
};

export const dynamic = 'force-dynamic';

export default async function ManagerPage() {
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

    return (
        <div className="flex flex-col gap-8 py-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1>👔 לוח מנהל</h1>
                <form action={managerLogoutAction}>
                    <button type="submit" className="text-sm underline text-white/70 hover:text-white">
                        התנתקות
                    </button>
                </form>
            </div>

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
                <div className="flex items-center justify-between mb-4">
                    <h2>📋 כל המשלוחים</h2>
                    <span className="text-sm text-white/70">
                        פתוחים: {openCount} · נמסרו: {deliveredCount}
                        {cancelledCount > 0 && ` · בוטלו: ${cancelledCount}`}
                    </span>
                </div>

                {deliveries.length === 0 ? (
                    <p className="p-6 text-center border rounded-2xl border-white/15 bg-white/5 text-white/60">
                        עדיין אין משלוחים. הוסף משלוח חדש למעלה.
                    </p>
                ) : (
                    <ul className="flex flex-col gap-4">
                        {deliveries.map((d) => (
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
