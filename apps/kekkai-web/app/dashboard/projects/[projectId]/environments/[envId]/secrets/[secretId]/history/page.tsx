import React from 'react';
import Link from 'next/link';
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
      <div className="max-w-3xl mx-auto p-12 text-center border-brutal bg-bg-surface shadow-brutal pixel-corners">
        <p className="font-mono text-sm text-text-secondary">No history found for this secret.</p>
        <Link
          href={`/dashboard/projects/${projectId}/environments/${envId}/secrets`}
          className="mt-4 inline-block font-mono text-xs font-bold uppercase bg-text-primary text-bg-primary px-4 py-2 border-brutal shadow-brutal hover:bg-brand-primary hover:text-white transition-all"
        >
          &larr; Back to Secrets
        </Link>
      </div>
    );
  }

  const keyName = history[0].secret.key;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-primary">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] font-bold text-brand-dark bg-brand-soft px-2 py-0.5 border border-brand-primary/20 uppercase">
              SECRET AUDIT // TIMELINE
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold uppercase tracking-tight text-text-primary">
            History: <span className="font-mono text-brand-primary lowercase">{keyName}</span>
          </h1>
          <p className="text-text-secondary font-mono text-xs mt-1">
            Tamper-evident record of changes. Secret values are never sent to the browser.
          </p>
        </div>

        <Link
          href={`/dashboard/projects/${projectId}/environments/${envId}/secrets`}
          className="font-mono text-xs font-bold uppercase px-3 py-2 border-brutal bg-bg-surface hover:bg-bg-secondary text-text-primary shadow-brutal transition-all pixel-corners self-start sm:self-auto"
        >
          &larr; Back to Secrets
        </Link>
      </div>

      <div className="relative border-l-2 border-border-primary ml-4 space-y-6">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {history.map((version: any, index: number) => {
          const isLatest = index === 0;

          return (
            <div key={version.id} className="relative pl-8">
              {/* Timeline marker */}
              <div 
                className={`absolute left-[-9px] top-4 w-4 h-4 pixel-corners border ${
                  isLatest 
                    ? 'bg-brand-primary border-brand-dark' 
                    : 'bg-bg-surface border-border-primary'
                }`} 
              />
              
              <div className="border-brutal bg-bg-surface shadow-brutal pixel-corners overflow-hidden">
                {/* 3-dot window bar */}
                <div className="h-7 bg-bg-secondary border-b border-border-primary flex items-center justify-between px-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-border-primary"></div>
                    <div className="w-2 h-2 rounded-full bg-border-primary"></div>
                    <div className="w-2 h-2 rounded-full bg-border-primary"></div>
                    <span className="text-[10px] font-mono text-text-muted ml-2">version // v{version.version}</span>
                  </div>
                  <span className="text-[10px] font-mono text-text-secondary">
                    {new Date(version.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-xs bg-bg-secondary border border-border-primary px-2.5 py-1 text-text-primary">
                        v{version.version}
                      </span>
                      {isLatest && (
                        <span className="text-[10px] font-mono font-bold text-brand-dark bg-brand-soft border border-brand-primary/20 px-2 py-0.5 uppercase">
                          CURRENT ACTIVE
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex gap-2">
                      <span className="text-text-secondary w-28 uppercase">Updated By:</span>
                      <span className="text-text-primary font-bold">{version.createdBy?.email || 'System'}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-text-secondary w-28 uppercase">AAD Context:</span>
                      <span className="text-text-primary break-all">
                        {version.aad ? 'Bound (Anti-tamper active)' : 'Legacy (Unbound)'}
                      </span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-text-secondary w-28 uppercase">Value:</span>
                      <span className="text-text-muted tracking-widest">&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border-primary flex justify-between items-center text-xs font-mono">
                    <span className="text-text-secondary">
                      KEK Version: {version.kekVersion}
                    </span>
                    {!isLatest && (
                      <span className="text-[11px] text-text-muted italic">
                        Rollback available via CLI
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
