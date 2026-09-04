import { CollectionView } from '../../../components/shop/collection-view';

export const metadata = {
    title: 'הקולקציה',
    alternates: { canonical: '/collection' }
};

export default function Page() {
    return <CollectionView />;
}
