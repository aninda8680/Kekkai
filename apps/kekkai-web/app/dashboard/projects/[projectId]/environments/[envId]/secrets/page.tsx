/**
 * Secrets table page — metadata ONLY.
 *
 * SECURITY INVARIANT (enforced by construction):
 * - This page never calls /reveal or any value-bearing endpoint
 * - The "Copy CLI command" action is the ONLY way to get a value
 * - No "reveal" button exists in the DOM
 * - Masked dots animate on hover to signal "intentionally hidden" (not a missing feature)
 */
import React from "react";
import Link from "next/link";
import { getSecretsMetadata } from "@/app/actions";

interface PageProps {
  params: Promise<{ envId: string; projectId: string }>;
}

export default async function SecretsPage({ params }: PageProps) {
  const { projectId, envId } = await params;
  const { secrets, environmentName, projectName } = await getSecretsMetadata(projectId, envId);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 font-mono text-xs text-text-secondary">
        <Link href={`/dashboard/projects/${projectId}`} className="hover:text-text-primary transition-colors">
          {projectName}
        </Link>
        <span>/</span>
        <span className="text-text-primary font-bold uppercase">{environmentName}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 md:pb-4 border-b border-border-primary">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-[10px] font-bold text-brand-dark bg-brand-soft px-2 py-0.5 border border-brand-primary/20 uppercase">
              ENVIRONMENT // VAULT
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-display font-extrabold uppercase tracking-tight text-text-primary">
            {environmentName}
          </h1>
          <p className="text-xs font-mono text-text-secondary mt-0.5">
            {secrets.length} secrets &mdash; values decrypt only in terminal
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="font-mono text-xs font-bold uppercase px-3 py-1.5 border-brutal bg-bg-surface hover:bg-bg-secondary text-text-primary shadow-brutal transition-all pixel-corners"
          >
            &larr; Project Overview
          </Link>
        </div>
      </div>

      {/* Security notice banner */}
      <div className="flex items-center gap-3 p-3 bg-brand-soft border border-brand-primary/20 pixel-corners text-xs font-mono text-brand-dark">
        <div className="w-5 h-5 bg-brand-primary text-white flex items-center justify-center shrink-0 pixel-corners font-bold text-xs">
          !
        </div>
        <div className="text-[11px] leading-tight">
          <strong>ZERO-TRUST POSTURE:</strong> Secret values never render in a browser. &ldquo;Copy CLI command&rdquo; to decrypt safely in your local shell.
        </div>
      </div>

      {/* Secrets table */}
      {secrets.length === 0 ? (
        <EmptySecretsState environmentName={environmentName} />
      ) : (
        <div className="border-brutal bg-bg-surface shadow-brutal pixel-corners overflow-hidden">
          {/* 3-dot window bar */}
          <div className="h-8 bg-bg-secondary border-b border-border-primary flex items-center px-4 gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
            <span className="text-[11px] font-mono text-text-muted ml-2">vault // {environmentName}</span>
          </div>

          <table className="w-full text-sm text-left" aria-label="Secrets table">
            <thead>
              <tr className="border-b border-border-primary bg-bg-secondary text-text-secondary font-mono text-xs uppercase">
                <th className="px-4 md:px-5 py-2.5 font-bold">KEY NAME</th>
                <th className="px-4 md:px-5 py-2.5 font-bold">VALUE</th>
                <th className="px-4 md:px-5 py-2.5 font-bold">VERSION</th>
                <th className="px-4 md:px-5 py-2.5 font-bold">UPDATED</th>
                <th className="text-right px-4 md:px-5 py-2.5 font-bold">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary text-text-primary">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {secrets.map((secret: any) => (
                <SecretRow
                  key={secret.id}
                  secret={secret}
                  environmentName={environmentName}
                  projectId={projectId}
                  envId={envId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SecretRow({ secret, environmentName, projectId, envId }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secret: any;
  environmentName: string;
  projectId: string;
  envId: string;
}) {
  const cliCommand = `cloak-env get ${secret.key} --env ${environmentName}`;

  return (
    <tr className="group hover:bg-bg-secondary/40 transition-colors" id={`secret-row-${secret.id}`}>
      {/* Key name — monospace */}
      <td className="px-5 py-4">
        <code className="font-mono text-sm font-bold text-text-primary">{secret.key}</code>
      </td>

      {/* Masked value — animated dots, signals "intentionally hidden" */}
      <td className="px-5 py-4">
        <span
          className="font-mono text-text-muted tracking-widest select-none text-xs"
          aria-label="Secret value hidden — use CLI to access"
          title="Values only decrypt in your terminal. Use: cloak-env get KEY"
        >
          &bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;
        </span>
      </td>

      {/* Version */}
      <td className="px-5 py-4">
        <span className="text-xs font-mono font-bold bg-bg-secondary border border-border-primary px-2 py-0.5 pixel-corners text-text-secondary">
          v{secret.latestVersion}
        </span>
      </td>

      {/* Updated */}
      <td className="px-5 py-4">
        <span className="text-xs font-mono text-text-secondary">
          {new Date(secret.updatedAt).toLocaleDateString(undefined, {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          })}
        </span>
      </td>

      {/* Actions — Copy CLI command only. No reveal button. */}
      <td className="px-5 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <CopyCliButton command={cliCommand} secretKey={secret.key} />
          <Link
            href={`/dashboard/projects/${projectId}/environments/${envId}/secrets/${secret.id}/history`}
            id={`secret-history-${secret.id}`}
            className="px-2.5 py-1 text-xs font-mono font-bold text-text-secondary hover:text-text-primary bg-bg-surface hover:bg-bg-secondary border border-border-primary pixel-corners transition-colors"
            aria-label={`View history for ${secret.key}`}
          >
            History
          </Link>
        </div>
      </td>
    </tr>
  );
}

/**
 * "Copy CLI command" — copies `cloak-env get KEY --env ENV` to clipboard.
 */
function CopyCliButton({ command, secretKey }: { command: string; secretKey: string }) {
  return (
    <button
      id={`copy-cli-${secretKey}`}
      data-command={command}
      className="copy-cli-btn px-2.5 py-1 text-xs font-mono font-bold text-brand-dark bg-brand-soft hover:bg-brand-primary hover:text-white border border-brand-primary/20 pixel-corners transition-all flex items-center gap-1.5 cursor-pointer"
      aria-label={`Copy CLI command to get ${secretKey}`}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      Copy CLI cmd
    </button>
  );
}

function EmptySecretsState({ environmentName }: { environmentName: string }) {
  return (
    <div className="text-center py-16 border-brutal bg-bg-surface shadow-brutal pixel-corners p-8">
      <div className="w-12 h-12 bg-brand-soft text-brand-dark border border-brand-primary/30 flex items-center justify-center mx-auto mb-4 pixel-corners">
        <svg className="w-6 h-6 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h3 className="text-base font-display font-extrabold uppercase mb-2 text-text-primary">
        No secrets in {environmentName}
      </h3>
      <p className="text-xs font-mono text-text-secondary mb-4 max-w-md mx-auto">
        Push secrets directly from your local terminal vault into this environment:
      </p>
      <code className="inline-block text-xs text-text-primary font-mono bg-bg-primary border border-border-primary px-4 py-2 pixel-corners">
        cloak-env push --env {environmentName}
      </code>
    </div>
  );
}
