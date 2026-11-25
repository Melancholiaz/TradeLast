-- Fresh workspace; public schema and old records are left untouched.
BEGIN;
CREATE SCHEMA IF NOT EXISTS tradingjournal_v2;
DO $$ BEGIN CREATE TYPE tradingjournal_v2."TradeDirection" AS ENUM ('BUY','SELL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tradingjournal_v2."TradeResult" AS ENUM ('WIN','LOSS','BE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS tradingjournal_v2."User" (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT, revision INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE IF NOT EXISTS tradingjournal_v2."TradingAccount" (
  id TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES tradingjournal_v2."User"(id) ON DELETE CASCADE,
  name TEXT NOT NULL, broker TEXT NOT NULL DEFAULT '', type TEXT NOT NULL DEFAULT 'Personal',
  "startingBalance" DECIMAL(20,5) NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'USD',
  "commissionPerLot" DECIMAL(18,5) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE IF NOT EXISTS tradingjournal_v2."TradingStrategy" (
  id TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES tradingjournal_v2."User"(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', rules TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#80b6ff', active BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE IF NOT EXISTS tradingjournal_v2."Trade" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES tradingjournal_v2."User"(id) ON DELETE CASCADE,
  "accountId" TEXT NOT NULL REFERENCES tradingjournal_v2."TradingAccount"(id) ON DELETE CASCADE,
  "strategyId" TEXT REFERENCES tradingjournal_v2."TradingStrategy"(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  "entryDate" DATE, "exitDate" DATE,
  session TEXT NOT NULL DEFAULT 'Unspecified',
  direction tradingjournal_v2."TradeDirection" NOT NULL,
  sentiment TEXT NOT NULL DEFAULT '', setup TEXT NOT NULL DEFAULT '',
  lots DECIMAL(20,5) NOT NULL DEFAULT 0,
  "entryPrice" DECIMAL(30,10) NOT NULL DEFAULT 0,
  "takeProfit" DECIMAL(30,10) NOT NULL DEFAULT 0,
  "stopLoss" DECIMAL(30,10) NOT NULL DEFAULT 0,
  gross DECIMAL(20,5) NOT NULL DEFAULT 0,
  commission DECIMAL(20,5) NOT NULL DEFAULT 0,
  adjustment DECIMAL(20,5) NOT NULL DEFAULT 0,
  rr TEXT NOT NULL DEFAULT '', result tradingjournal_v2."TradeResult" NOT NULL,
  notes TEXT NOT NULL DEFAULT '', "setupUrl" TEXT NOT NULL DEFAULT '',
  "emotionBefore" TEXT NOT NULL DEFAULT '', "emotionAfter" TEXT NOT NULL DEFAULT '',
  analysis TEXT NOT NULL DEFAULT '',
  "drawdownPoints" DECIMAL(20,5) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE IF NOT EXISTS tradingjournal_v2."JournalSettings" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES tradingjournal_v2."User"(id) ON DELETE CASCADE,
  "dailyLossLimit" DECIMAL(20,5) NOT NULL DEFAULT 5,
  "maxRiskPercent" DECIMAL(8,4) NOT NULL DEFAULT 1,
  "preferredCurrency" TEXT NOT NULL DEFAULT 'USD',
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "TradingAccount_userId_idx" ON tradingjournal_v2."TradingAccount"("userId");
CREATE INDEX IF NOT EXISTS "TradingStrategy_userId_idx" ON tradingjournal_v2."TradingStrategy"("userId");
CREATE INDEX IF NOT EXISTS "Trade_userId_entryDate_idx" ON tradingjournal_v2."Trade"("userId","entryDate");
CREATE INDEX IF NOT EXISTS "Trade_accountId_entryDate_idx" ON tradingjournal_v2."Trade"("accountId","entryDate");
CREATE INDEX IF NOT EXISTS "Trade_strategyId_idx" ON tradingjournal_v2."Trade"("strategyId");
CREATE INDEX IF NOT EXISTS "Trade_result_idx" ON tradingjournal_v2."Trade"("result");

CREATE TABLE IF NOT EXISTS tradingjournal_v2."LoginThrottle" (
  email TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  "windowStart" TIMESTAMPTZ NOT NULL
);
COMMIT;
