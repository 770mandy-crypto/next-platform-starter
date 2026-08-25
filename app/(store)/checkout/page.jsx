import { CheckoutOrder } from 'components/store/checkout-order';

export const metadata = {
    title: 'שליחת הזמנה'
};

export default function CheckoutPage() {
    return (
        <div className="px-6 py-16 mx-auto max-w-4xl sm:px-10 sm:py-20">
            <p className="eyebrow">שלב אחרון</p>
            <h1 className="mt-4">שליחת הזמנה</h1>
            <CheckoutOrder />
        </div>
    );
}
