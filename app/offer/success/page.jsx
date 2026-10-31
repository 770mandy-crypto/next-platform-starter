import Link from 'next/link';
import { offer } from 'lib/offer-config';

export const metadata = { title: 'התשלום התקבל' };

export default function SuccessPage() {
    return (
        <main className="max-w-md mx-auto px-5 py-16 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-extrabold mb-3">התשלום התקבל, תודה!</h1>
            <p className="text-slate-600 mb-8">
                ברוכים הבאים ל{offer.brand}. התוכנית נשלחת עכשיו למייל שהזנתם. אם היא לא הגיעה תוך כמה דקות, כדאי לבדוק גם בתיקיית הספאם.
            </p>
            <Link href="/offer" className="text-orange-600 font-semibold">
                חזרה לדף
            </Link>
        </main>
    );
}
