import { Suspense } from 'react';
import { SearchView } from '../../../components/store/views';

export const metadata = { title: 'חיפוש', robots: { index: false }, alternates: { canonical: '/search' } };

export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-[60vh]" />}>
            <SearchView />
        </Suspense>
    );
}
