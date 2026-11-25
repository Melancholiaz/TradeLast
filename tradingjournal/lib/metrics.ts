import type { Trade, Outcome } from './types';
export function net(trade: Trade) { return Math.round((trade.gross - trade.commission + trade.adjustment) * 1000) / 1000; }
export const money = (n:number, currency='USD') => `${n < 0 ? '-' : ''}${currency === 'USD' ? '$' : currency + ' '}${Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export const signedMoney = (n:number, currency='USD') => `${n > 0 ? '+' : n < 0 ? '-' : ''}${currency === 'USD' ? '$' : currency + ' '}${Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export const percent = (n:number) => `${n.toFixed(1)}%`;
export function dateLabel(d:string) { if (!d) return 'No date'; const p=d.split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:d; }
export function tradeStats(trades:Trade[]) {
 const total=trades.length, wins=trades.filter(t=>t.result==='WIN').length, losses=trades.filter(t=>t.result==='LOSS').length, be=trades.filter(t=>t.result==='BE').length;
 const gross=trades.reduce((s,t)=>s+t.gross,0), commission=trades.reduce((s,t)=>s+t.commission,0), netPnl=trades.reduce((s,t)=>s+net(t),0);
 const profits=trades.filter(t=>net(t)>0).reduce((s,t)=>s+net(t),0), lossesNet=trades.filter(t=>net(t)<0).reduce((s,t)=>s+Math.abs(net(t)),0);
 const profitFactor=lossesNet>0?profits/lossesNet:profits>0?Infinity:0;
 let balance=0, peak=0, maxDrawdown=0;
 for(const t of [...trades].sort((a,b)=>a.entryDate.localeCompare(b.entryDate)||a.id.localeCompare(b.id))){ balance+=net(t);peak=Math.max(peak,balance);maxDrawdown=Math.max(maxDrawdown,peak-balance); }
 return {total,wins,losses,be,gross,commission,netPnl,winRate:total?wins/total*100:0,profitFactor,maxDrawdown,avgTrade:total?netPnl/total:0};
}
export function byDay(trades:Trade[]){const map=new Map<string,{date:string;pnl:number;trades:number;wins:number}>(); for(const t of trades){if(!t.entryDate)continue; const v=map.get(t.entryDate)||{date:t.entryDate,pnl:0,trades:0,wins:0};v.pnl+=net(t);v.trades++;if(t.result==='WIN')v.wins++;map.set(t.entryDate,v);}return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));}
export function equityCurve(trades: Trade[], initial=0){let value=initial;return [{label:'Start',value},...[...trades].sort((a,b)=>a.entryDate.localeCompare(b.entryDate)||a.id.localeCompare(b.id)).map(t=>{value+=net(t);return {label:dateLabel(t.entryDate),value:Math.round(value*1000)/1000};})];}
export function groupStats(trades:Trade[], key:(t:Trade)=>string){const map=new Map<string,Trade[]>();for(const t of trades){const k=key(t)||'Unspecified'; map.set(k,[...(map.get(k)||[]),t]);}return [...map].map(([name,items])=>({name,...tradeStats(items)})).sort((a,b)=>b.total-a.total);}
export const outcomeClass=(v:Outcome)=>v==='WIN'?'win':v==='LOSS'?'loss':'be';
