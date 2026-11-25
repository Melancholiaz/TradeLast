export type Outcome = 'WIN' | 'LOSS' | 'BE';
export type Direction = 'BUY' | 'SELL';
export type Trade = {
  id: string; accountId: string; symbol: string; entryDate: string; exitDate: string;
  session: string; direction: Direction; sentiment: string; setup: string;
  strategyId: string; lots: number; entryPrice: number; takeProfit: number; stopLoss: number;
  gross: number; commission: number; adjustment: number; rr: string; result: Outcome;
  notes: string; setupUrl: string; emotionBefore: string; emotionAfter: string;
  analysis: string; drawdownPoints: number;
};
export type Account = { id: string; name: string; broker: string; type: string; startingBalance: number; currency: string; commissionPerLot: number; };
export type Strategy = { id: string; name: string; description: string; rules: string; color: string; active: boolean; };
export type Settings = { dailyLossLimit: number; maxRiskPercent: number; preferredCurrency: string; };
export type JournalState = { trades: Trade[]; accounts: Account[]; strategies: Strategy[]; settings: Settings; selectedAccount: string; };
