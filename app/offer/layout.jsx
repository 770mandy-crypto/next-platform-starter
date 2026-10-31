import { offer } from 'lib/offer-config';

export const metadata = {
    title: `${offer.brand} – הנחה מיוחדת`,
    description: `גרדו את הכרטיס וקבלו הנחה על ${offer.tagline}.`
};

export default function OfferLayout({ children }) {
    return (
        <div dir="rtl" lang="he" className="font-hebrew text-slate-900 bg-gradient-to-b from-orange-50 to-white min-h-[100dvh]">
            {children}
        </div>
    );
}
