'use client';

export function Turn({ turn, t }) {
    if (turn.role === 'tool') {
        return (
            <li className="text-xs text-slate-500">
                ⚙️ {t.calls.tool}: <code>{turn.tool_name}</code>
                {turn.flag && <span className="text-red-700"> ({turn.flag})</span>}
            </li>
        );
    }
    const agent = turn.role === 'agent';
    return (
        <li className={`flex ${agent ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${agent ? 'bg-teal-50' : 'bg-slate-100'}`}>
                <div className="text-xs text-slate-500">
                    {agent ? t.calls.agent : t.calls.customer}
                    {turn.latency_ms ? ` · ${(turn.latency_ms / 1000).toFixed(1)}s` : ''}
                    {turn.flag && <span className="text-amber-700"> · {turn.flag}</span>}
                </div>
                {turn.content}
            </div>
        </li>
    );
}
