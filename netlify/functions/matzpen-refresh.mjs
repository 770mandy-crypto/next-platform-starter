// Scheduled refresh of Matzpen's real-estate data. Every 30 minutes it
// refreshes the next few cities (see lib/nadlan/importer.js), so the whole
// city list is renewed several times a day.
import { getDb } from '../../lib/pilot/db.js';
import { refreshCycle } from '../../lib/nadlan/importer.js';
import { scoreChangeNotifier } from '../../lib/nadlan/notify.js';

export default async () => {
    const db = await getDb();
    const result = await refreshCycle({ db, notify: scoreChangeNotifier(db) });
    console.log('Matzpen refresh:', JSON.stringify(result));
    return new Response(JSON.stringify(result), { headers: { 'content-type': 'application/json' } });
};

export const config = { schedule: '*/30 * * * *' };
