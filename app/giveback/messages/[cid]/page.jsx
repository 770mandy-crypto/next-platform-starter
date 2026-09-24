import { Chat } from 'components/giveback/chat';

export const metadata = { title: 'צ׳אט' };

export default async function ChatPage({ params }) {
    const { cid } = await params;
    return <Chat cid={cid} />;
}
