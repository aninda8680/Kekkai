import React from 'react';
import { getSessions } from '@/app/actions';
import { SessionsClient } from './SessionsClient';

export default async function SettingsPage() {
  const data = await getSessions();

  return (
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-5">
      <div className="pb-3 md:pb-4 border-b border-border-primary">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[10px] font-bold text-brand-dark bg-brand-soft px-2 py-0.5 border border-brand-primary/20 uppercase">
            SECURITY // SESSIONS
          </span>
        </div>
        <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-extrabold uppercase tracking-tight text-text-primary">
          Sessions & Devices
        </h1>
        <p className="text-text-secondary text-xs sm:text-sm font-sans mt-0.5">
          Manage your active web browser sessions and authorized CLI devices.
        </p>
      </div>

      <SessionsClient 
        initialWebSessions={data?.webSessions || []} 
        initialCliDevices={data?.cliDevices || []} 
      />
    </div>
  );
}
