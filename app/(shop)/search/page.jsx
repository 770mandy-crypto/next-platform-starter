import { Suspense } from 'react';
import { SearchView } from '../../../components/shop/search-view';

export const metadata = {
    title: 'חיפוש',
    description: 'חיפוש בקטלוג AYIN לפי שם, קטגוריה, צבע או תיאור.',
    alternates: { canonical: '/search' },
    robots: { index: false }
};

export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-[60vh]" />}>
            <SearchView />
        </Suspense>
    );
}
