'use client';

import { useEffect, useState } from 'react';
import { CallsTable } from 'components/sales/calls-table';
import { api, Card, ErrorLine, useSales } from 'components/sales/shell';

export default function CallsPage() {
    const { t, lang } = useSales();
    const [includeTests, setIncludeTests] = useState(false);
    const [calls, setCalls] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        api(includeTests ? '/calls' : '/calls?channel=phone').then((d) => setCalls(d.calls), setError);
    }, [includeTests]);

    return (
        <Card>
            <label className="mb-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={includeTests} onChange={(e) => setIncludeTests(e.target.checked)} />
                {t.calls.showTests}
            </label>
            {error && <ErrorLine error={error} />}
            {!calls ? (
                <p className="text-slate-500">{t.loading}</p>
            ) : calls.length ? (
                <CallsTable calls={calls} t={t} lang={lang} />
            ) : (
                <p className="text-sm text-slate-500">{t.dash.empty}</p>
            )}
        </Card>
    );
}
