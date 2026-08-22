import { CartView } from 'components/store/cart-view';

export const metadata = {
    title: 'עגלת הקניות'
};

export default function CartPage() {
    return (
        <div className="px-6 py-16 mx-auto max-w-4xl sm:px-10 sm:py-20">
            <p className="eyebrow">ההזמנה שלך</p>
            <h1 className="mt-4">עגלת הקניות</h1>
            <CartView />
        </div>
    );
}
