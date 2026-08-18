import { CartProvider } from 'components/store/cart-provider';
import { GoldCursor, IntroCurtain, ScrollProgress } from 'components/store/motion/chrome';
import { StoreFooter } from 'components/store/store-footer';
import { StoreHeader } from 'components/store/store-header';

export default function StoreLayout({ children }) {
    return (
        <CartProvider>
            <div className="store flex flex-col min-h-screen" style={{ background: 'var(--color-ink)' }}>
                <IntroCurtain />
                <ScrollProgress />
                <GoldCursor />
                <StoreHeader />
                <main className="grow">{children}</main>
                <StoreFooter />
            </div>
        </CartProvider>
    );
}
