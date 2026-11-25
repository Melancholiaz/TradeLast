import type { JournalState } from './types';
export function emptyJournal(): JournalState {
  return { trades: [], accounts: [], strategies: [], settings: { dailyLossLimit: 5, maxRiskPercent: 1, preferredCurrency: 'USD' }, selectedAccount: 'all' };
}
