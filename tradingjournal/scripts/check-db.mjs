import pg from 'pg';
if(!process.env.DATABASE_URL){console.error('DATABASE_URL missing');process.exit(1);}
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:15000,max:1});
try{
  const {rows}=await pool.query(`SELECT (SELECT count(*) FROM tradingjournal_v2."Trade") AS trades,
   (SELECT count(*) FROM tradingjournal_v2."TradingAccount") AS accounts,
   (SELECT count(*) FROM tradingjournal_v2."TradingStrategy") AS strategies,
   (SELECT count(*) FROM tradingjournal_v2."User") AS users`);
  console.log('Connected to Neon — schema tradingjournal_v2');console.table(rows);
}catch(e){console.error('Connection/schema check failed:',e.code||e.name,e.message);process.exitCode=1;}
finally{await pool.end();}
