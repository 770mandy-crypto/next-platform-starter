import { CheckoutView } from '../../../components/store/views';

export const metadata = { title: 'תשלום', robots: { index: false }, alternates: { canonical: '/checkout' } };

export default function Page() {
    return <CheckoutView />;
}
