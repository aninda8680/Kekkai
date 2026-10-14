import React from 'react';
import Link from 'next/link';
import { getServiceTokens, getEnvironments } from '@/app/actions';
import { TokensClient } from './TokensClient';

export default async function ServiceTokensPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  
  const [tokens, environments] = await Promise.all([
    getServiceTokens(projectId),
    getEnvironments(projectId),
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 md:pb-4 border-b border-border-primary">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] font-bold text-brand-dark bg-brand-soft px-2 py-0.5 border border-brand-primary/20 uppercase">
              AUTOMATION // CI/CD
            </span>
          </div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-extrabold uppercase tracking-tight text-text-primary">
            Service Tokens
          </h1>
          <p className="text-text-secondary text-xs sm:text-sm font-sans mt-0.5">
            Service tokens are read-only and scoped to a single environment for secure CI/CD pipelines.
          </p>
        </div>

        <Link
          href={`/dashboard/projects/${projectId}`}
          className="font-mono text-xs font-bold uppercase px-3 py-2 border-brutal bg-bg-surface hover:bg-bg-secondary text-text-primary shadow-brutal transition-all pixel-corners self-start sm:self-auto"
        >
          &larr; Project Overview
        </Link>
      </div>

      <TokensClient 
        projectId={projectId} 
        initialTokens={Array.isArray(tokens) ? tokens : []} 
        environments={Array.isArray(environments) ? environments : []} 
      />
    </div>
  );
}
