import { AgentChat } from 'components/matzpen/agent-chat';
import { loadDataset } from 'lib/nadlan/dataset';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'הסוכן' };

export default async function AgentPage({ searchParams }) {
    const { q } = await searchParams;
    const data = await loadDataset();
    const areas = data.areas.map(({ id, name, cityName }) => ({ id, name, cityName }));
    return (
        <div className="mx-auto flex h-[calc(100dvh-140px)] max-w-3xl flex-col p-4 md:h-[calc(100dvh-110px)]">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <AgentChat areas={areas} initialQuestion={typeof q === 'string' ? q.slice(0, 500) : undefined} />
            </div>
        </div>
    );
}
