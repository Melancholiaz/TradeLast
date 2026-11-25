import 'server-only';
import { Pool } from 'pg';
const globalForPg = globalThis as unknown as { journalPool?: Pool };
export const pool = globalForPg.journalPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000,
  allowExitOnIdle: true,
});
if (!globalForPg.journalPool) {
  pool.on('error', () => console.error('Idle PostgreSQL connection failed'));
  globalForPg.journalPool = pool;
}
