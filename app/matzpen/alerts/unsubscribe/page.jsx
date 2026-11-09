import { UnsubscribeButton } from 'components/matzpen/follow-area';

export const metadata = { title: 'הסרה מההתראות' };

// A button rather than removal on open: mail scanners open links in emails,
// and that must not unsubscribe anyone.
export default async function UnsubscribePage({ searchParams }) {
    const { id, t } = await searchParams;
    return (
        <main className="mx-auto max-w-lg p-6 text-center">
            <h1 className="mb-4 text-2xl font-black">הסרה מההתראות</h1>
            <UnsubscribeButton id={typeof id === 'string' ? id : ''} t={typeof t === 'string' ? t : ''} />
        </main>
    );
}
