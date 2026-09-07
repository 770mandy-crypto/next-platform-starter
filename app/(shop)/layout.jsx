import { ShopProvider } from '../../components/shop/providers';
import { SiteHeader } from '../../components/shop/header';
import { SiteFooter } from '../../components/shop/footer';
import { CartDrawer } from '../../components/shop/cart-drawer';
import { JsonLd, organisationJsonLd } from '../../lib/shop/seo';

export const metadata = {
    metadataBase: new URL(process.env.URL ?? 'http://localhost:3000'),
    title: {
        template: '%s | AYIN',
        default: 'AYIN — משקפיים שנעשו כדי להיראות'
    },
    description:
        'AYIN — מותג משקפיים עצמאי. אצטט איטלקי, ליטוש בעבודת יד, עשרה דגמים ושישה עשר גוונים. משלוח חינם מעל 500 ₪.'
};

export default function ShopLayout({ children }) {
    return (
        <ShopProvider>
            <JsonLd data={organisationJsonLd()} />
            <div className="min-h-screen shop">
                <a
                    href="#main"
                    className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:top-3 focus:start-3 focus:px-5 focus:py-3 focus:bg-ink focus:text-bone"
                >
                    דלגו לתוכן
                </a>
                <SiteHeader />
                {/* The rail is fixed, so the page is inset by its width from lg up. */}
                <div className="flex flex-col min-h-screen lg:ps-64">
                    <main id="main" className="grow">{children}</main>
                    <SiteFooter />
                </div>
                <CartDrawer />
            </div>
        </ShopProvider>
    );
}
