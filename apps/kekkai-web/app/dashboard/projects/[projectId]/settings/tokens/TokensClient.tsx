'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createServiceToken, revokeServiceToken } from '@/app/actions';
import { TypedConfirmationModal } from '@/components/TypedConfirmationModal';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TokensClient({ projectId, initialTokens, environments }: { 
  projectId: string; 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialTokens: any[]; 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  environments: any[] 
}) {
  const router = useRouter();
  const [tokens, setTokens] = useState(initialTokens);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // New token form state
  const [name, setName] = useState('');
  const [environmentId, setEnvironmentId] = useState(environments[0]?.id || '');
  const [ttlDays, setTtlDays] = useState(30);

  // Result state
  const [newToken, setNewToken] = useState<{ token: string; name: string } | null>(null);

  // Revoke state
  const [tokenToRevoke, setTokenToRevoke] = useState<{ id: string; name: string } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await createServiceToken(projectId, name, environmentId, ttlDays);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setNewToken({ token: res.token, name: res.name });
      setIsCreating(false);
      setName('');
      // Refresh list from server (page reload or action call)
      router.refresh();
    }
  };

  const handleRevoke = async () => {
    if (!tokenToRevoke) return;
    
    await revokeServiceToken(projectId, tokenToRevoke.id);
    setTokens(tokens.filter(t => t.id !== tokenToRevoke.id));
    setTokenToRevoke(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* New Token Result Modal */}
      {newToken && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-emerald-500/50 rounded-xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
            <h3 className="text-xl font-bold text-white mb-2">Token Created: {newToken.name}</h3>
            
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-lg text-sm mb-6 flex gap-3">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p>Copy this token now. For security reasons, <strong>it will never be shown again</strong>.</p>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 font-mono text-emerald-400 text-sm break-all mb-6 select-all">
              {newToken.token}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setNewToken(null)}
                className="bg-white text-black px-4 py-2 rounded font-medium hover:bg-neutral-200"
              >
                I have copied it securely
              </button>
            </div>
          </div>
        </div>
      )}

      <TypedConfirmationModal
        isOpen={!!tokenToRevoke}
        title="Revoke Service Token"
        description={`This will permanently revoke access for "${tokenToRevoke?.name}". Any systems currently using this token will immediately begin receiving 401 Unauthorized errors.`}
        confirmText={`revoke ${tokenToRevoke?.name}`}
        actionLabel="Revoke Token"
        onConfirm={handleRevoke}
        onCancel={() => setTokenToRevoke(null)}
      />

      {/* Create Button & Form */}
      {!isCreating ? (
        <button
          onClick={() => setIsCreating(true)}
          className="bg-cyan-500 text-black px-4 py-2 rounded font-medium hover:bg-cyan-400 transition-colors"
        >
          Create Service Token
        </button>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h3 className="text-lg font-medium text-white mb-4">Create New Service Token</h3>
          <form onSubmit={handleCreate} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Token Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. github-actions-prod"
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                required
                pattern="^[a-zA-Z0-9_-]+$"
                title="Alphanumeric, hyphens, and underscores only"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Environment Scope</label>
              <select
                value={environmentId}
                onChange={(e) => setEnvironmentId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                required
              >
                {environments.map(env => (
                  <option key={env.id} value={env.id}>{env.name}</option>
                ))}
              </select>
              <p className="text-xs text-neutral-500 mt-1">Token will only have read access to this environment.</p>
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Expiration (Days)</label>
              <input
                type="number"
                min="1"
                max="90"
                value={ttlDays}
                onChange={(e) => setTtlDays(parseInt(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                required
              />
              <p className="text-xs text-neutral-500 mt-1">Maximum 90 days. Short-lived tokens are more secure.</p>
            </div>
            
            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => { setIsCreating(false); setError(''); }}
                className="px-4 py-2 text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-cyan-500 text-black px-4 py-2 rounded font-medium hover:bg-cyan-400 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Token'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Token List */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400">
            <tr>
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Environment</th>
              <th className="px-6 py-4 font-medium">Expires</th>
              <th className="px-6 py-4 font-medium">Last Used</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {tokens.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                  No active service tokens.
                </td>
              </tr>
            ) : (
              tokens.map((token) => (
                <tr key={token.id} className="text-neutral-300">
                  <td className="px-6 py-4 font-medium text-white">{token.name}</td>
                  <td className="px-6 py-4">
                    <span className="bg-neutral-800 text-neutral-300 px-2 py-1 rounded text-xs capitalize">
                      {token.environmentName}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {new Date(token.expiresAt).toLocaleDateString()}
                    {new Date(token.expiresAt) < new Date() && (
                      <span className="ml-2 text-red-400 text-xs">Expired</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-neutral-400">
                    {token.lastUsedAt ? (
                      <span title={token.lastIp || 'unknown IP'}>
                        {new Date(token.lastUsedAt).toLocaleDateString()}
                      </span>
                    ) : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setTokenToRevoke(token)}
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
  );
}
