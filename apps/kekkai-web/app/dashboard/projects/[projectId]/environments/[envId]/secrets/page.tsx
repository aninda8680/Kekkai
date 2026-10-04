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
import { getSecretsMetadata } from "@/app/actions";

interface PageProps {
  params: Promise<{ envId: string; projectId: string }>;
}

export default async function SecretsPage({ params }: PageProps) {
  const { projectId, envId } = await params;
  const { secrets, environmentName, projectName } = await getSecretsMetadata(projectId, envId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>{projectName}</span>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-white capitalize">{environmentName}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold capitalize">{environmentName}</h1>
          <p className="text-sm text-gray-400">{secrets.length} secrets — values only accessible via CLI</p>
        </div>
      </div>

      {/* Security notice banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-indigo-500/8 border border-indigo-500/20 text-sm">
        <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span className="text-indigo-200">
          Secret values never render in a browser. &ldquo;Copy CLI command&rdquo; to decrypt in your terminal.{" "}
          <a href="/security" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors">
            Why?
          </a>
        </span>
      </div>

      {/* Secrets table */}
      {secrets.length === 0 ? (
        <EmptySecretsState environmentName={environmentName} />
      ) : (
        <div className="rounded-xl border border-white/8 overflow-hidden bg-white/2">
          <table className="w-full text-sm" aria-label="Secrets table">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                <th className="text-left px-5 py-3 font-medium text-gray-400">KEY NAME</th>
                <th className="text-left px-5 py-3 font-medium text-gray-400">VALUE</th>
                <th className="text-left px-5 py-3 font-medium text-gray-400">VERSION</th>
                <th className="text-left px-5 py-3 font-medium text-gray-400">UPDATED</th>
                <th className="text-right px-5 py-3 font-medium text-gray-400">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
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
    <tr className="group hover:bg-white/3 transition-colors" id={`secret-row-${secret.id}`}>
      {/* Key name — monospace */}
      <td className="px-5 py-4">
        <code className="font-mono text-sm text-white/90">{secret.key}</code>
      </td>

      {/* Masked value — animated dots, signals "intentionally hidden" */}
      <td className="px-5 py-4">
        <span
          className="font-mono text-gray-500 tracking-widest select-none masked-value"
          aria-label="Secret value hidden — use CLI to access"
          title="Values only decrypt in your terminal. Use: cloak-env get KEY"
        >
          ••••••••••••••••••
        </span>
      </td>

      {/* Version */}
      <td className="px-5 py-4">
        <span className="text-xs text-gray-400 font-mono">v{secret.latestVersion}</span>
      </td>

      {/* Updated */}
      <td className="px-5 py-4">
        <span className="text-xs text-gray-400">
          {new Date(secret.updatedAt).toLocaleDateString(undefined, {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          })}
        </span>
      </td>

      {/* Actions — Copy CLI command only. No reveal button. */}
      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyCliButton command={cliCommand} secretKey={secret.key} />
          <a
            href={`/dashboard/projects/${projectId}/environments/${envId}/secrets/${secret.id}/history`}
            id={`secret-history-${secret.id}`}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/8 transition-all"
            aria-label={`View history for ${secret.key}`}
          >
            History
          </a>
        </div>
      </td>
    </tr>
  );
}

/**
 * "Copy CLI command" — the ONLY action that gives access to a value.
 * Copies `cloak-env get KEY --env ENV` to clipboard.
 * Toast reinforces the security model positively.
 */
function CopyCliButton({ command, secretKey }: { command: string; secretKey: string }) {
  return (
    <button
      id={`copy-cli-${secretKey}`}
      data-command={command}
      onClick={undefined}
      className="copy-cli-btn px-3 py-1.5 text-xs text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/20 hover:border-indigo-500/35 transition-all flex items-center gap-1.5"
      aria-label={`Copy CLI command to get ${secretKey}`}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      Copy CLI command
    </button>
  );
}

function EmptySecretsState({ environmentName }: { environmentName: string }) {
  return (
    <div className="text-center py-16 rounded-xl border border-dashed border-white/10">
      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h3 className="text-base font-medium mb-2">No secrets in {environmentName}</h3>
      <p className="text-sm text-gray-500 mb-1">
        Why can&apos;t I paste a secret here?{" "}
        <a href="/security" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
          Browser security policy ↗
        </a>
      </p>
      <p className="text-sm text-gray-500 mb-6">Push secrets from your local .env:</p>
      <code className="inline-block text-sm text-indigo-300 font-mono bg-black/60 border border-white/8 rounded px-4 py-2">
        cloak-env push --env {environmentName}
      </code>
    </div>
  );
}
