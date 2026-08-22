import Link from 'next/link';
import { Analyst } from 'components/bot/analyst';
import { FinnhubBanner } from 'components/bot/finnhub-banner';
import { isClaudeConfigured } from 'lib/bot';

export const metadata = {
    title: 'שוקי — בוט ניתוח בורסה'
};

export default function BotPage() {
    const claudeReady = isClaudeConfigured();

    return (
        <div dir="rtl" className="flex flex-col gap-8">
            <header className="flex flex-col gap-3">
                <h1>🤖 שוקי — אנליסט הבורסה</h1>
                <p className="max-w-2xl text-lg opacity-80">
                    הזן סימבול של מניה וקבל ניתוח טכני ופונדמנטלי מלא, ציון משוקלל מ-0 עד 100, והמלצה מנומקת. אפשר גם
                    להזין כמה סימבולים ולקבל דירוג השוואתי ביניהם.
                </p>
                <p className="opacity-70">
                    רוצה תמונה רחבה?{' '}
                    <Link href="/market" className="text-primary">
                        מפת השוק
                    </Link>{' '}
                    ·{' '}
                    <Link href="/scan" className="text-primary">
                        סורק מניות
                    </Link>
                </p>
            </header>

            <FinnhubBanner />

            {!claudeReady && (
                <div className="p-4 text-sm rounded-lg bg-white/5 border border-white/15">
                    לא הוגדר <code>ANTHROPIC_API_KEY</code>, ולכן הסיכום המילולי מופק על ידי מנוע הכללים המובנה. כל
                    הניתוח המספרי עובד במלואו בכל מקרה.
                </div>
            )}

            <Analyst />
        </div>
    );
}
