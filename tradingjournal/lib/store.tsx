'use client';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { emptyJournal } from './empty';
import type { Account, JournalState, Settings, Strategy, Trade } from './types';

type SyncStatus = 'loading' | 'saved' | 'saving' | 'error';
type StoreApi = {
  state:JournalState; hydrated:boolean; syncStatus:SyncStatus; error:string; setSelectedAccount:(v:string)=>void;
  addTrade:(v:Omit<Trade,'id'>)=>void; updateTrade:(id:string,v:Trade)=>void; deleteTrade:(id:string)=>void;
  addAccount:(v:Omit<Account,'id'>)=>void; updateAccount:(v:Account)=>void; deleteAccount:(id:string)=>void;
  addStrategy:(v:Omit<Strategy,'id'>)=>void; updateStrategy:(v:Strategy)=>void; deleteStrategy:(id:string)=>void;
  updateSettings:(v:Settings)=>void; reset:()=>void; replaceTrades:(v:Trade[])=>void; restoreBackup:(v:JournalState)=>void;
  activeTrades:Trade[]; retrySync:()=>void;
};
const Ctx = createContext<StoreApi | null>(null);
const snapshot = (state:JournalState) => ({...state, selectedAccount:'all'});
const id = () => crypto.randomUUID();

export function StoreProvider({ children }: {children: ReactNode}) {
  const [state,setState] = useState<JournalState>(emptyJournal);
  const [hydrated,setHydrated] = useState(false);
  const [syncStatus,setSyncStatus] = useState<SyncStatus>('loading');
  const [error,setError] = useState('');
  const current = useRef(state);
  const revision = useRef(0);
  const pending = useRef<JournalState|null>(null);
  const busy = useRef(false);
  const conflict = useRef(false);
  useEffect(()=>{
    const controller = new AbortController();
    async function load(){
      try{
        const res=await fetch('/api/journal',{cache:'no-store',signal:controller.signal});
        const data=await res.json();
        if(!res.ok)throw new Error(data.error||`Load failed (${res.status})`);
        if(controller.signal.aborted)return;
        revision.current=data.revision;
        current.current={...data.state,selectedAccount:'all'};
        setState(current.current);setHydrated(true);setSyncStatus('saved');
      }catch(e){if(!controller.signal.aborted){setError(e instanceof Error?e.message:'Neon unavailable');setSyncStatus('error');}}
    }
    void load();return()=>controller.abort();
  },[]);
  useEffect(()=>{
    const warn=(e:BeforeUnloadEvent)=>{if(pending.current||busy.current){e.preventDefault();e.returnValue='';}};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[]);
  async function flush(){
    if(busy.current||conflict.current)return;
    busy.current=true;setSyncStatus('saving');setError('');
    try{
      while(pending.current){
        const next=pending.current;pending.current=null;
        try{
          const res=await fetch('/api/journal',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:snapshot(next),revision:revision.current}),cache:'no-store'});
          const data=await res.json();
          if(res.status===409)conflict.current=true;
          if(!res.ok)throw new Error(data.error||`Save failed (${res.status})`);
          revision.current=data.revision;
        }catch(e){pending.current=pending.current??next;throw e;}
      }
      setSyncStatus('saved');
    }catch(e){setError(e instanceof Error?e.message:'Save failed');setSyncStatus('error');}
    finally{busy.current=false;}
  }
  function change(fn:(s:JournalState)=>JournalState, persist=true){
    if(!hydrated)return;
    const next=fn(current.current);current.current=next;setState(next);
    if(persist){pending.current=next;void flush();}
  }
  const activeTrades=useMemo(()=>state.selectedAccount==='all'?state.trades:state.trades.filter(t=>t.accountId===state.selectedAccount),[state]);
  const api:StoreApi={state,hydrated,syncStatus,error,activeTrades,
    setSelectedAccount:v=>change(s=>({...s,selectedAccount:v}),false),
    addTrade:v=>change(s=>({...s,trades:[{...v,id:id()},...s.trades]})),
    updateTrade:(key,v)=>change(s=>({...s,trades:s.trades.map(t=>t.id===key?{...v,id:key}:t)})),
    deleteTrade:key=>change(s=>({...s,trades:s.trades.filter(t=>t.id!==key)})),
    addAccount:v=>change(s=>({...s,accounts:[...s.accounts,{...v,id:id()}]})),
    updateAccount:v=>change(s=>({...s,accounts:s.accounts.map(a=>a.id===v.id?v:a)})),
    deleteAccount:key=>change(s=>({...s,accounts:s.accounts.filter(a=>a.id!==key),trades:s.trades.filter(t=>t.accountId!==key),selectedAccount:s.selectedAccount===key?'all':s.selectedAccount})),
    addStrategy:v=>change(s=>({...s,strategies:[...s.strategies,{...v,id:id()}]})),
    updateStrategy:v=>change(s=>({...s,strategies:s.strategies.map(a=>a.id===v.id?v:a)})),
    deleteStrategy:key=>change(s=>({...s,strategies:s.strategies.filter(a=>a.id!==key),trades:s.trades.map(t=>t.strategyId===key?{...t,strategyId:''}:t)})),
    updateSettings:v=>change(s=>({...s,settings:v})),
    reset:()=>change(()=>emptyJournal()),
    replaceTrades:v=>change(s=>({...s,trades:v})),
    restoreBackup:v=>change(()=>({...v,selectedAccount:'all'})),
    retrySync:()=>{if(conflict.current){if(confirm('Reload from Neon? Unsaved changes will be lost. Export a JSON backup first if needed.'))window.location.reload();}else if(!hydrated)window.location.reload();else void flush();},
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
export function useJournal(){const ctx=useContext(Ctx);if(!ctx)throw new Error('Missing StoreProvider');return ctx;}
