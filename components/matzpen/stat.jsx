export function Stat({ label, value }) {
    return (
        <div className="rounded-xl bg-slate-50 p-2">
            <div className="text-slate-500">{label}</div>
            <div className="font-bold text-slate-900">
                {value}
            </div>
        </div>
    );
}
