import { ServiceView } from '../../../components/shop/service-view';

export const metadata = {
    title: 'שירות',
    alternates: { canonical: '/service' }
};

export default function Page() {
    return <ServiceView />;
}
