import { StoreProvider } from '../../lib/store/context';
import { SiteHeader, SiteFooter, BagDrawer, Toast } from '../../components/store/chrome';
import { JsonLd, organisationJsonLd } from '../../lib/store/seo';

export const metadata = {
    metadataBase: new URL(process.env.URL ?? 'http://localhost:3000'),
    title: { template: '%s | MAOR', default: 'MAOR — אביזרים שנעשו כדי להיראות' },
    description:
        'MAOR — חנות אביזרים עצמאית: משקפי שמש, שעונים, תכשיטים, תיקים וארנקים. משלוח חינם מעל 400 ₪, 30 יום להחזרה.'
};

export default function StoreLayout({ children }) {
    return (
        <StoreProvider>
            <JsonLd data={organisationJsonLd()} />
            <div className="flex flex-col min-h-screen store">
                <a
                    href="#main"
                    className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:top-3 focus:start-3 focus:px-5 focus:py-3 focus:bg-ink focus:text-canvas"
                >
                    דלגו לתוכן
                </a>
                <SiteHeader />
                <main id="main" className="grow">
                    {children}
                </main>
                <SiteFooter />
                <BagDrawer />
                <Toast />
            </div>
        </StoreProvider>
    );
}
