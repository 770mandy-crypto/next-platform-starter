import { CartView } from 'components/store/cart-view';

export const metadata = {
    title: 'עגלת הקניות'
};

export default function CartPage() {
    return (
        <div className="px-6 py-12 mx-auto max-w-4xl">
            <h1>עגלת הקניות</h1>
            <CartView />
        </div>
    );
}
