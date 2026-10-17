// Runs the Hebrew conversation evaluation against the real model.
// Each run creates a fresh copy of the example business, so it never touches
// real data. It is paid model usage: roughly $0.3–0.6 per conversation.
//
// Usage:
//   DATABASE_URL=postgres://... ANTHROPIC_API_KEY=... npm run sales:eval-he
//   npm run sales:eval-he -- --only price_objection,slang_mixed
import { mkdir, writeFile } from 'node:fs/promises';
import { createUser } from '../lib/sales/auth.js';
import { createBusiness, createKnowledge } from '../lib/sales/business.js';
import { closePool, migrate, withTenant } from '../lib/sales/db.js';
import { runHebrewEval, reportMarkdown } from '../lib/sales/eval.js';
import { EXAMPLE_BUSINESS, EXAMPLE_KNOWLEDGE } from '../lib/sales/example.js';

const onlyArg = process.argv.indexOf('--only');
const only = onlyArg > 0 ? process.argv[onlyArg + 1].split(',') : undefined;

if (!process.env.DATABASE_URL || !(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)) {
    console.error('Set DATABASE_URL and ANTHROPIC_API_KEY.');
    process.exit(1);
}

try {
    await migrate();
    const stamp = Date.now();
    const user = await createUser({ name: 'Eval', email: `eval-${stamp}@example.com`, password: `eval-${stamp}`, ip: 'eval' });
    const business = await createBusiness(user.id, {
        ...EXAMPLE_BUSINESS,
        name: 'קליניקת תנועה',
        handoff_phone: '+972733333333'
    });
    await withTenant(business.id, async (db) => {
        for (const item of EXAMPLE_KNOWLEDGE) await createKnowledge(db, business.id, item, user.id);
    });
    const results = await runHebrewEval(business.id, { only, log: (line) => console.log(line) });
    await mkdir('sales-eval', { recursive: true });
    const base = `sales-eval/hebrew-${new Date(stamp).toISOString().replace(/[:.]/g, '-')}`;
    await writeFile(`${base}.md`, reportMarkdown(results));
    await writeFile(`${base}.json`, JSON.stringify(results, null, 2));
    console.log(`\nReport: ${base}.md`);
} catch (error) {
    console.error(error);
    process.exitCode = 1;
} finally {
    await closePool();
}
