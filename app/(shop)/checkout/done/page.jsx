import { CheckoutDone } from '../../../../components/shop/checkout-done';

export const metadata = {
    title: 'תודה',
    robots: { index: false, follow: false }
};

export default function Page() {
    return <CheckoutDone />;
}
