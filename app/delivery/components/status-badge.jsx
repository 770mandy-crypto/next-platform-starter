import { STATUS, STATUS_LABEL } from '../lib/store';

const STYLES = {
    [STATUS.AVAILABLE]: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    [STATUS.PICKED]: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    [STATUS.DELIVERED]: 'bg-green-500/20 text-green-300 border-green-500/40'
};

export function StatusBadge({ status }) {
    return (
        <span className={`inline-block px-3 py-1 text-xs font-bold border rounded-full ${STYLES[status] || ''}`}>
            {STATUS_LABEL[status] || status}
        </span>
    );
}
