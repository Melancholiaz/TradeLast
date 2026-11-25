import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { pool } from './db';
import type { PoolClient } from 'pg';
import { emptyJournal } from './empty';
import type { JournalState } from './types';

type DbValue = string | number | boolean | null;
const num = z.number().finite();
const text = z.string().max(30000);
const date = z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(v+'T00:00:00Z'); return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === v; }, 'Invalid date')]);
const accountSchema = z.object({
  id: z.string().min(1).max(150), name: text, broker: text, type: text,
  startingBalance: num, currency: z.literal('USD'), commissionPerLot: num,
});
const strategySchema = z.object({
  id: z.string().min(1).max(150), name: text, description: text, rules: text,
  color: z.string().max(30), active: z.boolean(),
});
const tradeSchema = z.object({
  id: z.string().min(1).max(150), accountId: z.string().min(1), strategyId: z.string(),
  symbol: z.string().min(1).max(100), entryDate: date, exitDate: date,
  session: text, direction: z.enum(['BUY','SELL']), sentiment: text, setup: text,
  lots: num, entryPrice: num, takeProfit: num, stopLoss: num, gross: num,
  commission: num, adjustment: num, rr: text, result: z.enum(['WIN','LOSS','BE']),
  notes: text, setupUrl: text, emotionBefore: text, emotionAfter: text,
  analysis: text, drawdownPoints: num,
});
export const payloadSchema = z.object({
  accounts: z.array(accountSchema).max(200),
  strategies: z.array(strategySchema).max(300),
  trades: z.array(tradeSchema).max(5000),
  settings: z.object({ dailyLossLimit: num, maxRiskPercent: num, preferredCurrency: z.literal('USD') }),
  selectedAccount: z.string(),
});

function numeric(v: unknown): number { return Number(v ?? 0); }
function queryDate(v: string) { return v || null; }

export async function readJournal(email: string): Promise<{state: JournalState; revision: number}> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const user = await client.query<{id:string; revision:number}>('SELECT id, revision FROM tradingjournal_v2."User" WHERE email=$1', [email]);
    if (!user.rows[0]) { await client.query('COMMIT'); return {state:emptyJournal(),revision:0}; }
    const {id:uid, revision} = user.rows[0];
    const accounts = await client.query('SELECT id, name, broker, type, "startingBalance", currency, "commissionPerLot" FROM tradingjournal_v2."TradingAccount" WHERE "userId"=$1 ORDER BY "createdAt"', [uid]);
    const strategies = await client.query('SELECT id, name, description, rules, color, active FROM tradingjournal_v2."TradingStrategy" WHERE "userId"=$1 ORDER BY "createdAt"', [uid]);
    const trades = await client.query('SELECT id, "accountId", "strategyId", symbol, to_char("entryDate",\'YYYY-MM-DD\') AS "entryDate", to_char("exitDate",\'YYYY-MM-DD\') AS "exitDate", session, direction, sentiment, setup, lots, "entryPrice", "takeProfit", "stopLoss", gross, commission, adjustment, rr, result, notes, "setupUrl", "emotionBefore", "emotionAfter", analysis, "drawdownPoints" FROM tradingjournal_v2."Trade" WHERE "userId"=$1 ORDER BY "createdAt" DESC', [uid]);
    const settings = await client.query('SELECT "dailyLossLimit", "maxRiskPercent", "preferredCurrency" FROM tradingjournal_v2."JournalSettings" WHERE "userId"=$1', [uid]);
  const state: JournalState = {
    accounts: accounts.rows.map(a => ({ ...a, startingBalance: numeric(a.startingBalance), commissionPerLot: numeric(a.commissionPerLot) })),
    strategies: strategies.rows,
    trades: trades.rows.map(t => ({ ...t,
      entryDate: t.entryDate || '', exitDate: t.exitDate || '', strategyId: t.strategyId || '',
      lots: numeric(t.lots), entryPrice: numeric(t.entryPrice), takeProfit: numeric(t.takeProfit), stopLoss: numeric(t.stopLoss),
      gross: numeric(t.gross), commission: numeric(t.commission), adjustment: numeric(t.adjustment), drawdownPoints: numeric(t.drawdownPoints),
    })),
    settings: settings.rows[0] ? {
      dailyLossLimit: numeric(settings.rows[0].dailyLossLimit), maxRiskPercent: numeric(settings.rows[0].maxRiskPercent),
      preferredCurrency: settings.rows[0].preferredCurrency,
    } : { dailyLossLimit: 5, maxRiskPercent: 1, preferredCurrency:'USD' },
    selectedAccount: 'all',
  };
    await client.query('COMMIT');
    return {state, revision};
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}

const accountFields = ['id','userId','name','broker','type','startingBalance','currency','commissionPerLot'];
const strategyFields = ['id','userId','name','description','rules','color','active'];
const tradeFields = [
  'id','userId','accountId','strategyId','symbol','entryDate','exitDate','session','direction','sentiment','setup',
  'lots','entryPrice','takeProfit','stopLoss','gross','commission','adjustment','rr','result','notes',
  'setupUrl','emotionBefore','emotionAfter','analysis','drawdownPoints',
];

function upsertSql(table: string, fields: string[], batchSize: number) {
  const q = (s: string) => `"${s}"`;
  const rows = Array.from({length: batchSize}, (_, rowIndex) => {
    const params = fields.map((_, fieldIndex) => `$${rowIndex * fields.length + fieldIndex + 1}`);
    return `(${params.join(',')}, NOW())`;
  }).join(',');
  const updates = fields.filter(f=>f!=='id'&&f!=='userId')
    .map(f=>`${q(f)}=EXCLUDED.${q(f)}`).join(',');
  return `INSERT INTO tradingjournal_v2."${table}" AS target (${fields.map(q).join(',')}, "updatedAt") VALUES ${rows}
    ON CONFLICT ("id") DO UPDATE SET ${updates}, "updatedAt"=NOW()
    WHERE target."userId"=EXCLUDED."userId"`;
}

type Client = PoolClient;
async function upsertRows(client: Client, table: string, fields: string[], rows: DbValue[][]) {
  for (let i=0; i<rows.length; i+=100) {
    const batch = rows.slice(i, i+100);
    const result = await client.query(upsertSql(table, fields, batch.length), batch.flat());
    if (result.rowCount !== batch.length) throw new Error('ID collision with another workspace');
  }
}

export class RevisionConflict extends Error {}
export async function saveJournal(email: string, value: z.infer<typeof payloadSchema>, revision: number): Promise<number> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");
  const accountIds = new Set(value.accounts.map(x=>x.id));
  const strategyIds = new Set(value.strategies.map(x=>x.id));
  if (accountIds.size !== value.accounts.length || strategyIds.size !== value.strategies.length || new Set(value.trades.map(x=>x.id)).size !== value.trades.length) {
    throw new Error('Duplicate IDs in journal data');
  }
  if (value.trades.some(t=>!accountIds.has(t.accountId))) throw new Error('Some trades reference accounts that do not exist');
  if (value.trades.some(t=>t.strategyId && !strategyIds.has(t.strategyId))) throw new Error('Some trades reference strategies that do not exist');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO tradingjournal_v2."User" (id,email,name,"updatedAt") VALUES ($1,$2,$3,NOW()) ON CONFLICT (email) DO NOTHING', [randomUUID(),email,'Personal Journal']);
    const userResult = await client.query<{id:string; revision:number}>('SELECT id, revision FROM tradingjournal_v2."User" WHERE email=$1 FOR UPDATE', [email]);
    const uid = userResult.rows[0].id;
    if (userResult.rows[0].revision !== revision) throw new RevisionConflict("Journal changed in another tab");
    await upsertRows(client, 'TradingAccount', accountFields,
      value.accounts.map(a=>accountFields.map(f=>f==='userId'?uid:(a as unknown as Record<string,DbValue>)[f])));
    await upsertRows(client, 'TradingStrategy', strategyFields,
      value.strategies.map(s=>strategyFields.map(f=>f==='userId'?uid:(s as unknown as Record<string,DbValue>)[f])));
    await upsertRows(client, 'Trade', tradeFields, value.trades.map(t=>{
      const row: Record<string,DbValue> = { ...t, strategyId: t.strategyId && strategyIds.has(t.strategyId) ? t.strategyId : null,
        entryDate: queryDate(t.entryDate), exitDate: queryDate(t.exitDate) };
      return tradeFields.map(f=>f==='userId'?uid:row[f]);
    }));
    await client.query('DELETE FROM tradingjournal_v2."Trade" WHERE "userId"=$1 AND NOT (id = ANY($2::text[]))', [uid,value.trades.map(t=>t.id)]);
    await client.query('DELETE FROM tradingjournal_v2."TradingAccount" WHERE "userId"=$1 AND NOT (id = ANY($2::text[]))', [uid,value.accounts.map(a=>a.id)]);
    await client.query('DELETE FROM tradingjournal_v2."TradingStrategy" WHERE "userId"=$1 AND NOT (id = ANY($2::text[]))', [uid,value.strategies.map(s=>s.id)]);
    await client.query(`INSERT INTO tradingjournal_v2."JournalSettings" (id,"userId","dailyLossLimit","maxRiskPercent","preferredCurrency","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW())
        ON CONFLICT ("userId") DO UPDATE SET "dailyLossLimit"=EXCLUDED."dailyLossLimit", "maxRiskPercent"=EXCLUDED."maxRiskPercent", "preferredCurrency"=EXCLUDED."preferredCurrency", "updatedAt"=NOW()`,
        [`settings-${uid}`,uid,value.settings.dailyLossLimit,value.settings.maxRiskPercent,value.settings.preferredCurrency]);
    const next = await client.query<{revision:number}>('UPDATE tradingjournal_v2."User" SET revision=revision+1, "updatedAt"=NOW() WHERE id=$1 RETURNING revision', [uid]);
    await client.query('COMMIT');
    return next.rows[0].revision;
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}
