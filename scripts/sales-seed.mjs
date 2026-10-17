// Creates the example business for the MVP: an owner account and a small,
// verified knowledge base. Run once after migrating.
// Usage: DATABASE_URL=... SEED_EMAIL=you@example.com SEED_PASSWORD=... npm run sales:seed
import { createUser } from '../lib/sales/auth.js';
import { createBusiness, createKnowledge } from '../lib/sales/business.js';
import { closePool, withTenant } from '../lib/sales/db.js';
import { EXAMPLE_BUSINESS, EXAMPLE_KNOWLEDGE } from '../lib/sales/example.js';

const email = process.env.SEED_EMAIL;
const password = process.env.SEED_PASSWORD;
if (!email || !password) {
    console.error('Set SEED_EMAIL and SEED_PASSWORD (at least 8 characters).');
    process.exit(1);
}

try {
    const user = await createUser({ name: 'Owner', email, password, ip: 'seed' });
    const business = await createBusiness(user.id, EXAMPLE_BUSINESS);
    await withTenant(business.id, async (db) => {
        for (const item of EXAMPLE_KNOWLEDGE) await createKnowledge(db, business.id, item, user.id);
    });
    console.log(`Created "${business.name}" (${business.id}) owned by ${email}.`);
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
} finally {
    await closePool();
}
