import React from 'react';
import { getSecretHistory } from '@/app/actions';

export default async function SecretHistoryPage({
  params,
}: {
  params: Promise<{ projectId: string; envId: string; secretId: string }>;
}) {
  const { projectId, envId, secretId } = await params;
  const history = await getSecretHistory(projectId, envId, secretId);

  if (!history || history.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center text-neutral-500">
        No history found for this secret.
      </div>
    );
  }

  const keyName = history[0].secret.key;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Version History: <span className="text-cyan-400 font-mono">{keyName}</span>
        </h1>
        <p className="text-neutral-400">
          Timeline of changes to this secret. Secret values are never sent to the browser.
        </p>
      </div>

      <div className="relative border-l border-neutral-800 ml-3 space-y-8">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {history.map((version: any, index: number) => {
          const isLatest = index === 0;

          return (
            <div key={version.id} className="relative pl-8 group">
              {/* Timeline dot */}
              <div 
                className={`absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 ${
                  isLatest 
                    ? 'bg-cyan-500 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' 
                    : 'bg-neutral-900 border-neutral-700 group-hover:border-neutral-500 transition-colors'
                }`} 
              />
              
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5 hover:bg-neutral-900 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-neutral-800 text-white px-2.5 py-1 rounded-md text-sm font-medium">
                      v{version.version}
                    </span>
                    {isLatest && (
                      <span className="text-xs font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-neutral-500">
                    {new Date(version.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex gap-2">
                    <span className="text-neutral-500 w-24">Updated By:</span>
                    <span className="text-neutral-300">{version.createdBy?.email || 'Unknown User'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-neutral-500 w-24">AAD Context:</span>
                    <span className="text-neutral-400 font-mono text-xs break-all max-w-full">
                      {version.aad ? 'Bound (Anti-tamper active)' : 'Legacy (Unbound)'}
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-neutral-500 w-24">Value:</span>
                    <div className="flex gap-1">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-neutral-800 flex justify-between items-center">
                  <p className="text-xs text-neutral-500">
                    KEK Version: {version.kekVersion}
                  </p>
                  {!isLatest && (
                    <button className="text-sm text-cyan-500 hover:text-cyan-400 font-medium transition-colors">
                      Restore Version
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
