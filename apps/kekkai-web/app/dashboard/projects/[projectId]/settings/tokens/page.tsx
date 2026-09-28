import React from 'react';
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
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Service Tokens</h1>
        <p className="text-neutral-400">
          Service tokens are used for CI/CD automation. They are scoped to a single environment and are read-only (can only pull secrets).
        </p>
      </div>

      <TokensClient 
        projectId={projectId} 
        initialTokens={Array.isArray(tokens) ? tokens : []} 
        environments={Array.isArray(environments) ? environments : []} 
      />
    </div>
  );
}
