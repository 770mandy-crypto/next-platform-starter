import Link from 'next/link';

export const metadata = {
    title: 'ניהול משלוחים'
};

export default function DeliveryHome() {
    return (
        <div className="flex flex-col gap-10 max-w-2xl mx-auto py-8">
            <div className="text-center">
                <h1 className="mb-4">🚚 מערכת ניהול משלוחים</h1>
                <p className="text-lg text-white/80">בחר כיצד להיכנס למערכת</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
                <Link
                    href="/delivery/manager"
                    className="flex flex-col items-center gap-3 p-8 text-center transition border rounded-2xl border-white/15 bg-white/5 hover:bg-white/10 no-underline"
                >
                    <span className="text-5xl">👔</span>
                    <span className="text-xl font-bold">כניסת מנהל</span>
                    <span className="text-sm text-white/70">
                        הוספת משלוחים חדשים ומעקב אחרי הסטטוס. נדרשת סיסמה.
                    </span>
                </Link>

                <Link
                    href="/delivery/courier"
                    className="flex flex-col items-center gap-3 p-8 text-center transition border rounded-2xl border-white/15 bg-white/5 hover:bg-white/10 no-underline"
                >
                    <span className="text-5xl">🛵</span>
                    <span className="text-xl font-bold">כניסת שליח</span>
                    <span className="text-sm text-white/70">
                        צפייה במשלוחים, לקיחת משלוח, אישור מסירה וצפייה בתשלום.
                    </span>
                </Link>
            </div>
        </div>
    );
}
