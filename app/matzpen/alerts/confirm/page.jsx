import Link from 'next/link';
import { confirm } from 'lib/nadlan/alerts';
import { getDb } from 'lib/pilot/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'אישור התראות' };

// Opening the link from the email confirms the address.
export default async function ConfirmPage({ searchParams }) {
    const { id, t } = await searchParams;
    const record = await confirm(await getDb(), id, t).catch(() => null);
    return (
        <main className="mx-auto max-w-lg p-6 text-center">
            {record ? (
                <>
                    <div className="mb-3 text-5xl">🔔</div>
                    <h1 className="mb-2 text-2xl font-black">ההתראות פעילות</h1>
                    <p className="mb-6 text-slate-600">נשלח לכם מייל כשהציון של שכונה שאתם עוקבים אחריה משתנה, או כשעולה בה דירה חדשה למכירה.</p>
                </>
            ) : (
                <>
                    <h1 className="mb-2 text-2xl font-black">הקישור לא תקין</h1>
                    <p className="mb-6 text-slate-600">אולי כבר הוסרתם מההתראות. אפשר להירשם מחדש מעמוד של כל שכונה.</p>
                </>
            )}
            <Link href="/matzpen/ranking" className="rounded-full bg-indigo-600 px-6 py-3 font-bold text-white no-underline">
                לדירוג השכונות
            </Link>
        </main>
    );
}
