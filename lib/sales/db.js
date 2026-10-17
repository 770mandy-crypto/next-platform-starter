// PostgreSQL access for the sales agent.
//
// Every query that touches business data runs inside withTenant(businessId),
// which opens a transaction and sets app.business_id for it; row-level
// security (db/sales/001_init.sql) then hides every other tenant's rows.
// withSystem() is the explicit, greppable escape hatch for the few code paths
// that must cross tenants (resolving an inbound number, the dispatcher, the
// retention job, creating a business).

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../db/sales');

let pool;

export function isDatabaseConfigured() {
    return Boolean(process.env.DATABASE_URL);
}

export function getPool() {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            const error = new Error('DATABASE_URL is not set');
            error.status = 503;
            error.code = 'db_not_configured';
            throw error;
        }
        pool = new pg.Pool({
            connectionString: process.env.DATABASE_URL,
            max: Number(process.env.DATABASE_POOL_MAX || 5),
            ssl: process.env.DATABASE_SSL === 'require' ? { rejectUnauthorized: true } : undefined
        });
    }
    return pool;
}

export async function closePool() {
    if (pool) {
        const current = pool;
        pool = undefined;
        await current.end();
    }
}

async function inTransaction(settings, fn) {
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');
        for (const [name, value] of Object.entries(settings)) {
            await client.query('SELECT set_config($1, $2, true)', [name, value]);
        }
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    } finally {
        client.release();
    }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
    return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function withTenant(businessId, fn) {
    if (!isUuid(businessId)) throw new Error('withTenant needs a business id');
    return inTransaction({ 'app.business_id': businessId, 'app.system': 'off' }, fn);
}

export function withSystem(fn) {
    return inTransaction({ 'app.system': 'on' }, fn);
}

// Applies db/sales/*.sql in name order, each once, each in its own transaction.
export async function migrate({ log = () => {} } = {}) {
    const client = await getPool().connect();
    try {
        await client.query(`CREATE TABLE IF NOT EXISTS sales_schema_migrations (
            name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
        const done = new Set((await client.query('SELECT name FROM sales_schema_migrations')).rows.map((r) => r.name));
        const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
        const applied = [];
        for (const file of files) {
            if (done.has(file)) continue;
            const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query('INSERT INTO sales_schema_migrations (name) VALUES ($1)', [file]);
                await client.query('COMMIT');
            } catch (error) {
                await client.query('ROLLBACK');
                throw new Error(`Migration ${file} failed: ${error.message}`);
            }
            applied.push(file);
            log(`applied ${file}`);
        }
        return applied;
    } finally {
        client.release();
    }
}
