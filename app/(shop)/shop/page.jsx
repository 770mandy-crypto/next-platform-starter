import { Suspense } from 'react';
import { ListingView } from '../../../components/store/views';

export const metadata = {
    title: 'כל הפריטים',
    description: 'כל הקטלוג של MAOR: משקפי שמש, שעונים, תכשיטים, תיקים, ארנקים וכובעים.',
    alternates: { canonical: '/shop' }
};

export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-[60vh]" />}>
            <ListingView />
        </Suspense>
    );
}
