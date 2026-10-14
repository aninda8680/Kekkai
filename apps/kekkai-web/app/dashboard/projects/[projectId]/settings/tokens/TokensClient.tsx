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
  environments: any[]; 
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="border-brutal bg-bg-surface shadow-brutal pixel-corners max-w-lg w-full overflow-hidden">
            <div className="h-8 bg-bg-secondary border-b border-border-primary flex items-center px-4 gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
              <span className="text-[11px] font-mono text-text-muted ml-2">token // generated</span>
            </div>

            <div className="p-6">
              <h3 className="text-xl font-display font-extrabold uppercase text-text-primary mb-2">
                Token Created: {newToken.name}
              </h3>
              
              <div className="bg-brand-soft border border-brand-primary/20 text-brand-dark p-4 pixel-corners text-xs font-mono mb-4 flex gap-3">
                <span className="font-bold text-brand-primary text-sm">!</span>
                <p>Copy this token now. For security reasons, <strong>it will never be displayed again</strong>.</p>
              </div>

              <div className="bg-bg-primary border border-border-primary p-3 font-mono text-xs text-text-primary break-all mb-6 select-all pixel-corners">
                {newToken.token}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setNewToken(null)}
                  className="font-mono text-xs font-bold uppercase bg-text-primary text-bg-primary px-5 py-2.5 border-brutal shadow-brutal hover:bg-brand-primary hover:text-white transition-all cursor-pointer"
                >
                  I have copied it securely
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <TypedConfirmationModal
        isOpen={!!tokenToRevoke}
        title="Revoke Service Token"
        description={`This will permanently revoke access for "${tokenToRevoke?.name}". Any systems currently using this token will immediately receive 401 Unauthorized errors.`}
        confirmText={`revoke ${tokenToRevoke?.name}`}
        actionLabel="Revoke Token"
        onConfirm={handleRevoke}
        onCancel={() => setTokenToRevoke(null)}
      />

      {/* Create Button & Form */}
      {!isCreating ? (
        <button
          onClick={() => setIsCreating(true)}
          className="font-mono text-xs font-bold uppercase bg-text-primary text-bg-primary px-4 py-2.5 border-brutal shadow-brutal hover:bg-brand-primary hover:text-white transition-all flex items-center gap-2 cursor-pointer"
        >
          <span className="text-sm">+</span>
          Create Service Token
        </button>
      ) : (
        <div className="border-brutal bg-bg-surface shadow-brutal pixel-corners overflow-hidden">
          <div className="h-8 bg-bg-secondary border-b border-border-primary flex items-center px-4 gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
            <span className="text-[11px] font-mono text-text-muted ml-2">token // new-credential</span>
          </div>

          <div className="p-6">
            <h3 className="text-lg font-display font-extrabold uppercase text-text-primary mb-4">
              Create New Service Token
            </h3>
            <form onSubmit={handleCreate} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-text-secondary mb-1">Token Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. github-actions-prod"
                  className="w-full bg-bg-primary border border-border-primary px-3 py-2 text-text-primary font-mono text-xs focus:outline-none focus:border-brand-primary pixel-corners"
                  required
                  pattern="^[a-zA-Z0-9_-]+$"
                  title="Alphanumeric, hyphens, and underscores only"
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-text-secondary mb-1">Environment Scope</label>
                <select
                  value={environmentId}
                  onChange={(e) => setEnvironmentId(e.target.value)}
                  className="w-full bg-bg-primary border border-border-primary px-3 py-2 text-text-primary font-mono text-xs focus:outline-none focus:border-brand-primary pixel-corners"
                  required
                >
                  {environments.map(env => (
                    <option key={env.id} value={env.id}>{env.name}</option>
                  ))}
                </select>
                <p className="text-[11px] font-mono text-text-muted mt-1">Token will only have read access to this environment.</p>
              </div>
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-text-secondary mb-1">Expiration (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={ttlDays}
                  onChange={(e) => setTtlDays(parseInt(e.target.value))}
                  className="w-full bg-bg-primary border border-border-primary px-3 py-2 text-text-primary font-mono text-xs focus:outline-none focus:border-brand-primary pixel-corners"
                  required
                />
                <p className="text-[11px] font-mono text-text-muted mt-1">Maximum 90 days. Short-lived tokens are more secure.</p>
              </div>
              
              {error && <p className="text-accent-red font-mono text-xs">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setError(''); }}
                  className="px-4 py-2 font-mono text-xs text-text-secondary hover:text-text-primary border border-border-primary bg-bg-surface pixel-corners cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="font-mono text-xs font-bold uppercase bg-text-primary text-bg-primary px-4 py-2 border-brutal shadow-brutal hover:bg-brand-primary hover:text-white disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? 'Creating...' : 'Create Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Token List */}
      <div className="border-brutal bg-bg-surface shadow-brutal pixel-corners overflow-hidden">
        <div className="h-8 bg-bg-secondary border-b border-border-primary flex items-center px-4 gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
          <span className="text-[11px] font-mono text-text-muted ml-2">tokens // active-credentials</span>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-bg-secondary border-b border-border-primary text-text-secondary font-mono uppercase text-xs">
            <tr>
              <th className="px-6 py-3 font-bold">Name</th>
              <th className="px-6 py-3 font-bold">Environment</th>
              <th className="px-6 py-3 font-bold">Expires</th>
              <th className="px-6 py-3 font-bold">Last Used</th>
              <th className="px-6 py-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-primary text-text-primary">
            {tokens.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-text-secondary font-mono text-xs">
                  No active service tokens.
                </td>
              </tr>
            ) : (
              tokens.map((token) => (
                <tr key={token.id} className="hover:bg-bg-secondary/40 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-xs text-text-primary">{token.name}</td>
                  <td className="px-6 py-4">
                    <span className="bg-brand-soft border border-brand-primary/20 text-brand-dark px-2 py-0.5 pixel-corners text-xs font-mono uppercase">
                      {token.environmentName}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-text-secondary">
                    {new Date(token.expiresAt).toLocaleDateString()}
                    {new Date(token.expiresAt) < new Date() && (
                      <span className="ml-2 text-accent-red font-bold">Expired</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-text-secondary">
                    {token.lastUsedAt ? (
                      <span title={token.lastIp || 'unknown IP'}>
                        {new Date(token.lastUsedAt).toLocaleDateString()}
                      </span>
                    ) : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setTokenToRevoke(token)}
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
  );
}
