/**
 * Dashboard main page — project grid.
 *
 * Security: This page never fetches or renders secret values.
 * The secrets table (on the project detail page) shows metadata only.
 */
import Link from "next/link";
import React from "react";
import { getProjects } from "../actions";

export default async function DashboardPage() {
  const projects = await getProjects();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Your Projects</h1>
          <p className="text-text-secondary text-sm">
            Manage your vaults. Secret values are only accessible via the CLI.
          </p>
        </div>
        <Link
          href="/dashboard/projects/new"
          id="new-project-button"
          className="bg-brand-primary border-brutal shadow-brutal text-white hover:text-brand-dark px-4 py-2 rounded-none text-sm font-bold font-mono transition-all active:translate-y-1 active:shadow-none flex items-center gap-2 uppercase"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </Link>
      </div>

      {/* Projects grid */}
      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {projects.map((project: any) => (
            <ProjectCard key={project.id} project={project} />
          ))}
          <NewProjectCard />
        </div>
      )}

      {/* CLI hint */}
      <div className="rounded-none border-brutal bg-bg-surface p-5 flex items-start gap-4 shadow-[4px_4px_0_0_var(--brand-dark)]">
        <div className="w-9 h-9 rounded-none bg-brand-soft border border-brand-primary flex items-center justify-center shrink-0 pixel-corners">
          <svg className="w-5 h-5 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary mb-1">CLI-first by design</p>
          <p className="text-xs text-text-secondary leading-relaxed">
            Secret values never render in a browser — this is a core security guarantee. Use the CLI to read or manage individual values:
          </p>
          <code className="mt-2 block text-xs text-brand-dark font-mono bg-bg-primary border border-border-primary rounded-none px-3 py-2">
            cloak-env get JWT_SECRET --env production
          </code>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProjectCard({ project }: { project: any }) {
  const totalSecrets = project.environments?.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, e: any) => sum + (e.secretCount || 0),
    0
  ) ?? 0;

  return (
    <Link
      href={`/dashboard/projects/${project.id}`}
      id={`project-card-${project.id}`}
      className="group bg-bg-surface border-brutal rounded-none p-5 hover:bg-bg-elevated hover:border-brand-primary transition-all cursor-pointer relative overflow-hidden block shadow-brutal"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-soft rounded-full blur-[50px] group-hover:bg-brand-muted transition-all pointer-events-none opacity-20" />

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="w-9 h-9 rounded-none bg-bg-primary border border-text-primary flex items-center justify-center pixel-corners">
          <span className="font-bold text-sm uppercase">{project.name.charAt(0)}</span>
        </div>
        <span className="px-2 py-0.5 rounded-none text-[10px] font-bold font-mono bg-brand-primary text-white border border-brand-dark uppercase tracking-widest">
          Active
        </span>
      </div>

      <h3 className="text-base font-semibold mb-0.5 relative z-10">{project.name}</h3>
      <p className="text-xs text-text-secondary mb-4 font-mono relative z-10">{project.slug}</p>

      <div className="flex items-center justify-between pt-3.5 border-t border-border-primary text-xs text-text-secondary relative z-10 font-mono">
        <span>{project.environments?.length ?? 0} environments</span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          {totalSecrets} secrets
        </span>
      </div>
    </Link>
  );
}

function NewProjectCard() {
  return (
    <Link
      href="/dashboard/projects/new"
      id="new-project-card"
      className="bg-bg-primary border border-dashed border-border-primary rounded-none p-5 flex flex-col items-center justify-center text-center hover:border-brand-primary hover:bg-brand-soft transition-all cursor-pointer group min-h-[180px]"
    >
      <div className="w-10 h-10 rounded-none border border-border-primary bg-bg-surface flex items-center justify-center mb-3 group-hover:bg-brand-primary group-hover:text-white transition-colors pixel-corners">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <h3 className="text-sm font-bold font-mono uppercase mb-1 group-hover:text-brand-dark transition-colors">New project</h3>
      <p className="text-xs text-text-secondary font-mono">Or via CLI: <code className="font-mono text-brand-dark">cloak-env init</code></p>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-none bg-bg-surface border-brutal flex items-center justify-center mx-auto mb-5 shadow-brutal">
        <svg className="w-8 h-8 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 className="text-lg font-bold font-mono uppercase mb-2">No projects yet</h2>
      <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
        Projects hold your environments and secrets. Create one from the CLI or here.
      </p>
      <code className="inline-block text-sm text-brand-primary font-mono bg-bg-surface border-brutal rounded-none px-4 py-2 mb-4">
        cloak-env init
      </code>
    </div>
  );
}
