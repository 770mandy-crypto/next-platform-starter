import { Inbox } from 'components/giveback/inbox';

export const metadata = { title: 'הודעות' };

export default function MessagesPage() {
    return (
        <div className="flex flex-col gap-6">
            <h1>הודעות</h1>
            <Inbox />
        </div>
    );
}
