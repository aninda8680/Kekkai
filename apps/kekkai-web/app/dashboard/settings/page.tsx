import React from 'react';
import { getSessions } from '@/app/actions';
import { SessionsClient } from './SessionsClient';

export default async function SettingsPage() {
  const data = await getSessions();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Sessions & Devices</h1>
        <p className="text-neutral-400">
          Manage your active web sessions and authorized CLI devices.
        </p>
      </div>

      <SessionsClient 
        initialWebSessions={data?.webSessions || []} 
        initialCliDevices={data?.cliDevices || []} 
      />
    </div>
  );
}
