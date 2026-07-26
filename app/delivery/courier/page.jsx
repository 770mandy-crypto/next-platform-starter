import Link from 'next/link';
import { getCourierName } from '../lib/auth';
import { listDeliveries, STATUS } from '../lib/store';
import {
    courierLogoutAction,
    takeDeliveryAction,
    confirmDeliveryAction
} from '../actions';
import { CourierLoginForm } from '../components/courier-login-form';
import { StatusBadge } from '../components/status-badge';

export const metadata = {
    title: 'שליח | ניהול משלוחים'
};

export const dynamic = 'force-dynamic';

export default async function CourierPage() {
    const courierName = await getCourierName();

    if (!courierName) {
        return (
            <div className="py-8">
                <CourierLoginForm />
                <p className="mt-6 text-sm text-center text-white/60">
                    <Link href="/delivery">← חזרה למסך הבחירה</Link>
                </p>
            </div>
        );
    }

    const all = await listDeliveries();
    const available = all.filter((d) => d.status === STATUS.AVAILABLE);
    const mine = all.filter((d) => d.courierName === courierName);
    const inProgress = mine.filter((d) => d.status === STATUS.PICKED);
    const delivered = mine.filter((d) => d.status === STATUS.DELIVERED);

    // סך התשלום שהשליח מרוויח על משלוחים שנמסרו
    const totalEarned = delivered.reduce((sum, d) => sum + (d.payment || 0), 0);
    // תשלום צפוי על משלוחים שעדיין בדרך
    const pendingPay = inProgress.reduce((sum, d) => sum + (d.payment || 0), 0);

    return (
        <div className="flex flex-col gap-8 py-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1>🛵 שלום, {courierName}</h1>
                <form action={courierLogoutAction}>
                    <button type="submit" className="text-sm underline text-white/70 hover:text-white">
                        התנתקות
                    </button>
                </form>
            </div>

            {/* סיכום רווחים */}
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-5 border rounded-2xl border-green-500/40 bg-green-500/10">
                    <p className="text-sm text-white/70">💰 הרווחת עד כה (משלוחים שנמסרו)</p>
                    <p className="text-3xl font-bold text-green-300">{totalEarned} ₪</p>
                </div>
                <div className="p-5 border rounded-2xl border-blue-500/40 bg-blue-500/10">
                    <p className="text-sm text-white/70">⏳ תשלום בדרך (משלוחים פתוחים)</p>
                    <p className="text-3xl font-bold text-blue-300">{pendingPay} ₪</p>
                </div>
            </div>

            {/* משלוחים זמינים לקחת */}
            <section>
                <h2 className="mb-4">📦 משלוחים זמינים</h2>
                {available.length === 0 ? (
                    <p className="p-6 text-center border rounded-2xl border-white/15 bg-white/5 text-white/60">
                        אין כרגע משלוחים זמינים.
                    </p>
                ) : (
                    <ul className="flex flex-col gap-4">
                        {available.map((d) => (
                            <li key={d.id} className="flex flex-col gap-3 p-5 border rounded-2xl border-white/15 bg-white/5">
                                <p className="text-lg font-bold">📍 {d.address}</p>
                                {d.notes && <p className="text-sm text-white/60">{d.notes}</p>}
                                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-white/80">
                                    <span>💰 אתה מקבל: <b className="text-primary">{d.payment} ₪</b></span>
                                    {d.deadline && <span>⏰ עד: {d.deadline}</span>}
                                </div>
                                <form action={takeDeliveryAction} className="self-start">
                                    <input type="hidden" name="id" value={d.id} />
                                    <button type="submit" className="btn btn-sm">קח משלוח זה</button>
                                </form>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* משלוחים שלקחתי - בדרך ללקוח */}
            <section>
                <h2 className="mb-4">🚚 המשלוחים שלי (בדרך)</h2>
                {inProgress.length === 0 ? (
                    <p className="p-6 text-center border rounded-2xl border-white/15 bg-white/5 text-white/60">
                        אין לך משלוחים פעילים כרגע.
                    </p>
                ) : (
                    <ul className="flex flex-col gap-4">
                        {inProgress.map((d) => (
                            <li key={d.id} className="flex flex-col gap-3 p-5 border rounded-2xl border-blue-500/30 bg-blue-500/5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <p className="text-lg font-bold">📍 {d.address}</p>
                                    <StatusBadge status={d.status} />
                                </div>
                                {d.notes && <p className="text-sm text-white/60">{d.notes}</p>}
                                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-white/80">
                                    <span>💰 אתה מקבל: <b className="text-primary">{d.payment} ₪</b></span>
                                    {d.deadline && <span>⏰ עד: {d.deadline}</span>}
                                </div>
                                <form action={confirmDeliveryAction} className="self-start">
                                    <input type="hidden" name="id" value={d.id} />
                                    <button type="submit" className="btn btn-sm">✅ אשר שהמשלוח נמסר</button>
                                </form>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* היסטוריית משלוחים שנמסרו */}
            {delivered.length > 0 && (
                <section>
                    <h2 className="mb-4">✅ נמסרו</h2>
                    <ul className="flex flex-col gap-3">
                        {delivered.map((d) => (
                            <li
                                key={d.id}
                                className="flex flex-wrap items-center justify-between gap-3 p-4 border rounded-2xl border-green-500/25 bg-green-500/5"
                            >
                                <span className="font-medium">📍 {d.address}</span>
                                <span className="text-green-300">+{d.payment} ₪</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
