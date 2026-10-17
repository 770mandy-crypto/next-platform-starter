// Applies the sales agent's database migrations (db/sales/*.sql).
// Usage: DATABASE_URL=postgres://... npm run sales:migrate
import { closePool, migrate } from '../lib/sales/db.js';

try {
    const applied = await migrate({ log: (line) => console.log(line) });
    console.log(applied.length ? `done: ${applied.length} migration(s)` : 'database is up to date');
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
} finally {
    await closePool();
}
