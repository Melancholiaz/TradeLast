import { readFile } from 'node:fs/promises';
import pg from 'pg';
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL missing in .env.local'); process.exit(1); }
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL, max:1, connectionTimeoutMillis:15000});
let client;
try {
  client = await pool.connect();
  await client.query(await readFile(new URL('./neon_tables.sql',import.meta.url),'utf8'));
  const {rows} = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='tradingjournal_v2' ORDER BY table_name");
  console.log('Neon setup OK: tradingjournal_v2'); console.table(rows);
} catch (error) {
  if(client) await client.query('ROLLBACK').catch(()=>{});
  console.error('Setup failed:',error.code||error.name,error.message); process.exitCode=1;
} finally {client?.release();await pool.end();}
