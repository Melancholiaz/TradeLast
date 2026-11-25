import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { StoreProvider } from '@/lib/store';
import { AppFrame } from '@/components/app-frame';
import './globals.css';
export const metadata:Metadata={title:'TradingJournal Pro | Your trading edge',description:'Trade journal, strategy tracking and performance analytics'};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="th"><body><StoreProvider><AppFrame>{children}</AppFrame></StoreProvider></body></html>}
