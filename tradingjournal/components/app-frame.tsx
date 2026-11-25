'use client';
import { useJournal } from '@/lib/store';
import { Shell } from './shell';
import type { ReactNode } from 'react';

export function AppFrame({ children }: { children: ReactNode }) {
  const { hydrated, syncStatus, error, retrySync } = useJournal();
  if (!hydrated) return <main style={{ minHeight:'100vh', display:'grid', placeItems:'center', background:'#101925', color:'white', padding:24 }}>
    <div>{syncStatus === 'error' ? `เชื่อมต่อ Neon ไม่สำเร็จ: ${error}` : 'กำลังโหลดข้อมูลจาก Neon PostgreSQL...'}{syncStatus==='error'&&<p><button className="btn btn-secondary" onClick={retrySync}>Retry connection</button></p>}</div>
  </main>;
  return <Shell>{children}</Shell>;
}
