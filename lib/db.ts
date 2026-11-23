import pg from 'pg';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const globalDb = globalThis as unknown as { pool?: pg.Pool; schema?: Promise<void> };
export const pool = globalDb.pool ??= new pg.Pool({connectionString:process.env.DATABASE_URL, max:10, connectionTimeoutMillis:5000});
export async function ready() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_NOT_CONFIGURED');
  globalDb.schema ??= (async () => {
    const c = await pool.connect();
    try { await c.query('SELECT pg_advisory_lock(4820101)'); await c.query(await readFile(path.join(process.cwd(),'lib/schema.sql'),'utf8')); }
    finally { await c.query('SELECT pg_advisory_unlock(4820101)'); c.release(); }
  })().catch(e => { globalDb.schema = undefined; throw e; });
  return globalDb.schema;
}
export async function query(text:string, values:unknown[] = []) { await ready(); return pool.query(text,values); }
