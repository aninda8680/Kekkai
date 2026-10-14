'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { revokeWebSession, revokeCliDevice } from '@/app/actions';
import { TypedConfirmationModal } from '@/components/TypedConfirmationModal';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SessionsClient({ 
  initialWebSessions, 
  initialCliDevices 
}: { 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialWebSessions: any[]; 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialCliDevices: any[]; 
}) {
  const router = useRouter();
  const [webSessions, setWebSessions] = useState(initialWebSessions);
  const [cliDevices, setCliDevices] = useState(initialCliDevices);
  
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; type: 'web' | 'cli'; name: string } | null>(null);

  const handleRevoke = async () => {
    if (!revokeTarget) return;

    if (revokeTarget.type === 'web') {
      await revokeWebSession(revokeTarget.id);
      setWebSessions(webSessions.filter(s => s.id !== revokeTarget.id));
    } else {
      await revokeCliDevice(revokeTarget.id);
      setCliDevices(cliDevices.filter(d => d.id !== revokeTarget.id));
    }
    
    setRevokeTarget(null);
    router.refresh();
  };

  return (
    <div className="space-y-5 md:space-y-6">
      <TypedConfirmationModal
        isOpen={!!revokeTarget}
        title={`Revoke ${revokeTarget?.type === 'web' ? 'Web Session' : 'CLI Device'}`}
        description={`This will permanently revoke access for "${revokeTarget?.name}". The session/device will immediately lose access to CLOAK-ENV.`}
        confirmText="revoke"
        actionLabel="Revoke Access"
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />

      {/* CLI Devices */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg font-display font-extrabold uppercase tracking-tight text-text-primary">
            Authorized CLI Devices
          </h2>
          <span className="font-mono text-xs text-text-secondary">
            {cliDevices.length} devices
          </span>
        </div>

        <div className="border-brutal bg-bg-surface shadow-brutal pixel-corners overflow-hidden">
          {/* 3-dot window bar */}
          <div className="h-8 bg-bg-secondary border-b border-border-primary flex items-center px-4 gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
            <span className="text-[11px] font-mono text-text-muted ml-2">devices // authorized-cli</span>
          </div>

          <table className="w-full text-left text-sm">
            <thead className="bg-bg-secondary border-b border-border-primary text-text-secondary font-mono uppercase text-xs">
              <tr>
                <th className="px-4 md:px-6 py-2.5 font-bold">Device Name</th>
                <th className="px-4 md:px-6 py-2.5 font-bold">IP Address</th>
                <th className="px-4 md:px-6 py-2.5 font-bold">Last Used</th>
                <th className="px-4 md:px-6 py-2.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary text-text-primary">
              {cliDevices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 md:px-6 py-6 text-center text-text-secondary font-mono text-xs">
                    No active CLI devices. Use <code className="bg-bg-secondary border border-border-primary px-1.5 py-0.5 font-mono text-text-primary">cloak-env login</code> to authorize a device.
                  </td>
                </tr>
              ) : (
                cliDevices.map((device) => (
                  <tr key={device.id} className="hover:bg-bg-secondary/40 transition-colors">
                    <td className="px-4 md:px-6 py-2.5 md:py-3 font-mono font-bold text-xs text-text-primary">{device.name}</td>
                    <td className="px-4 md:px-6 py-2.5 md:py-3 font-mono text-xs text-text-secondary">{device.lastIp || 'unknown'}</td>
                    <td className="px-4 md:px-6 py-2.5 md:py-3 font-mono text-xs text-text-secondary">
                      {new Date(device.lastUsedAt).toLocaleString()}
                    </td>
                    <td className="px-4 md:px-6 py-2.5 md:py-3 text-right">
                      <button
                        onClick={() => setRevokeTarget({ id: device.id, type: 'cli', name: device.name })}
                        className="font-mono text-xs font-bold uppercase text-accent-red hover:underline cursor-pointer"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Web Sessions */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg font-display font-extrabold uppercase tracking-tight text-text-primary">
            Active Web Sessions
          </h2>
          <span className="font-mono text-xs text-text-secondary">
            {webSessions.length} sessions
          </span>
        </div>

        <div className="border-brutal bg-bg-surface shadow-brutal pixel-corners overflow-hidden">
          {/* 3-dot window bar */}
          <div className="h-8 bg-bg-secondary border-b border-border-primary flex items-center px-4 gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
            <span className="text-[11px] font-mono text-text-muted ml-2">sessions // browser</span>
          </div>

          <table className="w-full text-left text-sm">
            <thead className="bg-bg-secondary border-b border-border-primary text-text-secondary font-mono uppercase text-xs">
              <tr>
                <th className="px-4 md:px-6 py-2.5 font-bold">Browser / Device</th>
                <th className="px-4 md:px-6 py-2.5 font-bold">IP Address</th>
                <th className="px-4 md:px-6 py-2.5 font-bold">Started At</th>
                <th className="px-4 md:px-6 py-2.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary text-text-primary">
              {webSessions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 md:px-6 py-6 text-center text-text-secondary font-mono text-xs">
                    No active web sessions.
                  </td>
                </tr>
              ) : (
                webSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-bg-secondary/40 transition-colors">
                    <td className="px-4 md:px-6 py-2.5 md:py-3 truncate max-w-[200px] font-mono text-xs text-text-primary" title={session.userAgent || 'unknown'}>
                      {session.userAgent || 'unknown device'}
                    </td>
                    <td className="px-4 md:px-6 py-2.5 md:py-3 font-mono text-xs text-text-secondary">{session.ipAddress || 'unknown'}</td>
                    <td className="px-4 md:px-6 py-2.5 md:py-3 font-mono text-xs text-text-secondary">
                      {new Date(session.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 md:px-6 py-2.5 md:py-3 text-right">
                      <button
                        onClick={() => setRevokeTarget({ id: session.id, type: 'web', name: session.ipAddress || session.id })}
                        className="font-mono text-xs font-bold uppercase text-accent-red hover:underline cursor-pointer"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
