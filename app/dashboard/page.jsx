import { redirect } from 'next/navigation';
import { auth } from 'lib/auth.js';
import { getPortfolio } from 'lib/portfolio.js';
import { PortfolioManager } from 'components/dashboard/portfolio-manager';

export const metadata = {
    title: 'האזור האישי שלי — שוקי'
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const session = await auth();
    if (!session?.user?.email) redirect('/login?callbackUrl=/dashboard');

    const holdings = await getPortfolio(session.user.email);

    return (
        <div dir="rtl" className="flex flex-col gap-8">
            <header className="flex flex-col gap-2">
                <h1>👤 האזור האישי שלי</h1>
                <p className="opacity-70">
                    מחובר כ-<span dir="ltr">{session.user.email}</span>. הרשימה כאן שמורה רק בשבילך — היא נשמרת בין
                    ביקורים ונטענת מחדש בכל מכשיר שבו אתה מתחבר.
                </p>
            </header>

            <PortfolioManager initialHoldings={holdings} />
        </div>
    );
}
