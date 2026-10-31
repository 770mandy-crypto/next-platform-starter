import { SiteFooter, SiteHeader } from 'components/fit/site-chrome';
import { offer } from 'lib/offer-config';

export const metadata = {
    title: { template: `%s | ${offer.brand}`, default: `${offer.brand} – ${offer.tagline}` },
    description: `${offer.tagline}: אימונים קצרים מהבית, בלי ציוד ובלי מנוי לחדר כושר.`
};

export default function FitLayout({ children }) {
    return (
        <div dir="rtl" lang="he" className="font-hebrew flex min-h-[100dvh] flex-col bg-white text-slate-900">
            <SiteHeader />
            <div className="flex-1">{children}</div>
            <SiteFooter />
        </div>
    );
}
