import { cookies } from 'next/headers';
import { getSessionUser, SESSION_COOKIE } from 'lib/pilot/auth';
import { Simulator } from './simulator';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'סימולטור', robots: { index: false } };

export default async function SimulatorPage() {
    const user = await getSessionUser((await cookies()).get(SESSION_COOKIE)?.value ?? null);
    if (!user) {
        return (
            <main className="mx-auto max-w-md px-5 py-16 text-center">
                <h1 className="mb-3 text-2xl font-black">לנסות את העוזר</h1>
                <p className="mb-6 text-slate-600">כדי לנסות את העוזר כאן, בלי וואטסאפ, צריך להתחבר לאתר.</p>
                <a href="/pilot" className="rounded-full bg-emerald-600 px-6 py-3 font-bold text-white no-underline">
                    התחברות או הרשמה
                </a>
            </main>
        );
    }
    return <Simulator />;
}
