import { SavedView } from '../../../components/store/views';

export const metadata = { title: 'שמורים', robots: { index: false }, alternates: { canonical: '/saved' } };

export default function Page() {
    return <SavedView />;
}
