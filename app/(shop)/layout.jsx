import { ShopProvider } from '../../components/shop/providers';
import { SiteHeader } from '../../components/shop/header';
import { SiteFooter } from '../../components/shop/footer';
import { CartDrawer } from '../../components/shop/cart-drawer';

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
            <div className="flex flex-col min-h-screen shop">
                <SiteHeader />
                <main className="grow">{children}</main>
                <SiteFooter />
                <CartDrawer />
            </div>
        </ShopProvider>
    );
}
