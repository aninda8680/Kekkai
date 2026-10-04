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
    <div className="space-y-10">
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
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Authorized CLI Devices</h2>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400">
              <tr>
                <th className="px-6 py-4 font-medium">Device Name</th>
                <th className="px-6 py-4 font-medium">IP Address</th>
                <th className="px-6 py-4 font-medium">Last Used</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {cliDevices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">
                    No active CLI devices. Use <code className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-neutral-300">cloak-env login</code> to authorize a device.
                  </td>
                </tr>
              ) : (
                cliDevices.map((device) => (
                  <tr key={device.id} className="text-neutral-300">
                    <td className="px-6 py-4 font-medium text-white">{device.name}</td>
                    <td className="px-6 py-4 font-mono text-xs">{device.lastIp || 'unknown'}</td>
                    <td className="px-6 py-4">
                      {new Date(device.lastUsedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setRevokeTarget({ id: device.id, type: 'cli', name: device.name })}
                        className="text-red-400 hover:text-red-300 font-medium transition-colors"
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
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Active Web Sessions</h2>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400">
              <tr>
                <th className="px-6 py-4 font-medium">Device / Browser</th>
                <th className="px-6 py-4 font-medium">IP Address</th>
                <th className="px-6 py-4 font-medium">Started At</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {webSessions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">
                    No active web sessions (which is impossible since you&apos;re viewing this).
                  </td>
                </tr>
              ) : (
                webSessions.map((session) => (
                  <tr key={session.id} className="text-neutral-300">
                    <td className="px-6 py-4 truncate max-w-[200px]" title={session.userAgent || 'unknown'}>
                      {session.userAgent || 'unknown device'}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{session.ipAddress || 'unknown'}</td>
                    <td className="px-6 py-4">
                      {new Date(session.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setRevokeTarget({ id: session.id, type: 'web', name: session.ipAddress || session.id })}
                        className="text-red-400 hover:text-red-300 font-medium transition-colors"
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
