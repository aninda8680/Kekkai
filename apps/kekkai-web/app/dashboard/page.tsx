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
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-primary pb-4">
        <div>
          <div className="font-mono text-xs font-bold text-brand-dark bg-brand-soft uppercase tracking-widest mb-1.5 border border-brand-primary/20 px-2.5 py-0.5 inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-brand-primary" />
            VAULT REGISTRY
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold uppercase tracking-tight text-text-primary">
            Your Projects
          </h1>
          <p className="text-text-secondary text-xs font-sans max-w-xl mt-0.5">
            Cryptographic secret vaults. Encrypted locally and synchronized across environments.
          </p>
        </div>
        <Link
          href="/dashboard/projects/new"
          id="new-project-button"
          className="bg-text-primary text-bg-primary hover:bg-brand-primary hover:text-white font-mono text-xs font-bold uppercase px-4 py-2 border-brutal shadow-brutal active:translate-y-0.5 active:shadow-none transition-all pixel-corners flex items-center gap-2 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </Link>
      </div>

      {/* Projects grid */}
      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {projects.map((project: any) => (
              <ProjectCard key={project.id} project={project} />
            ))}
            <NewProjectCard />
          </div>

          {/* CLI hint */}
          <div className="border-brutal bg-bg-surface shadow-brutal p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-9 h-9 bg-brand-soft border border-brand-primary/30 flex items-center justify-center shrink-0 pixel-corners">
              <svg className="w-4 h-4 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="font-display font-bold uppercase text-text-primary text-xs tracking-tight">CLI-First By Design</h4>
                <span className="font-mono text-[9px] text-brand-dark bg-brand-soft px-1.5 py-0.5 uppercase border border-brand-primary/20 font-bold">Zero-Trust</span>
              </div>
              <p className="text-[11px] text-text-secondary font-sans leading-tight">
                Values decrypt only in terminal. Decrypt directly using:
              </p>
            </div>
            <code className="text-[11px] text-brand-dark font-mono bg-bg-secondary border border-border-primary px-3 py-1.5 shrink-0 select-all">
              cloak-env get KEY_NAME
            </code>
          </div>
        </>
      )}
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
      className="group bg-bg-surface border-brutal shadow-brutal hover:border-brand-primary hover:shadow-[6px_6px_0px_0px_var(--brand-dark)] transition-all cursor-pointer overflow-hidden block"
    >
      {/* Window title bar */}
      <div className="h-8 bg-bg-secondary border-b border-border-primary flex items-center justify-between px-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-border-primary" />
          <div className="w-2 h-2 rounded-full bg-border-primary" />
          <div className="w-2 h-2 rounded-full bg-border-primary" />
        </div>
        <span className="font-mono text-[10px] font-bold text-brand-dark bg-brand-soft border border-brand-primary/20 px-1.5 py-0.5 uppercase tracking-wider">
          ACTIVE
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 bg-brand-soft border border-brand-primary/30 flex items-center justify-center font-mono font-bold text-sm text-brand-dark pixel-corners shrink-0">
            {project.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-display font-bold uppercase text-text-primary tracking-tight truncate group-hover:text-brand-primary transition-colors">
              {project.name}
            </h3>
            <p className="text-xs text-text-secondary font-mono truncate">{project.slug}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border-primary text-xs font-mono text-text-secondary">
          <span>{project.environments?.length ?? 0} environments</span>
          <span className="text-brand-dark font-bold bg-brand-soft border border-brand-primary/20 px-2 py-0.5">
            {totalSecrets} secrets
          </span>
        </div>
      </div>
    </Link>
  );
}

function NewProjectCard() {
  return (
    <Link
      href="/dashboard/projects/new"
      id="new-project-card"
      className="bg-bg-primary border border-dashed border-border-primary p-6 flex flex-col items-center justify-center text-center hover:border-brand-primary hover:bg-brand-soft transition-all cursor-pointer group min-h-[170px]"
    >
      <div className="w-10 h-10 border border-border-primary bg-bg-surface flex items-center justify-center mb-3 group-hover:bg-brand-primary group-hover:text-white transition-colors pixel-corners">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <h3 className="text-xs font-bold font-mono uppercase tracking-wider mb-1 text-text-primary group-hover:text-brand-dark transition-colors">
        + Initialize Vault
      </h3>
      <p className="text-[11px] text-text-secondary font-mono">
        Or run: <code className="text-brand-dark font-bold">cloak-env init</code>
      </p>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="border-brutal bg-bg-surface shadow-brutal p-6 sm:p-8 pt-10 sm:pt-12 text-center overflow-hidden relative">
      <div className="h-8 bg-bg-secondary border-b border-border-primary absolute top-0 inset-x-0 flex items-center px-4 gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-border-primary" />
        <div className="w-2.5 h-2.5 rounded-full bg-border-primary" />
        <div className="w-2.5 h-2.5 rounded-full bg-border-primary" />
        <span className="text-[11px] font-mono text-text-muted ml-2">registry // empty</span>
      </div>
      <div>
        <div className="w-11 h-11 bg-brand-soft border border-brand-primary/30 flex items-center justify-center mx-auto mb-3 pixel-corners">
          <svg className="w-5 h-5 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-lg md:text-xl font-display font-extrabold uppercase tracking-tight text-text-primary mb-1">
          No Vaults Initialized
        </h2>
        <p className="text-xs text-text-secondary mb-4 max-w-md mx-auto leading-relaxed">
          Projects store your encrypted environments and configuration tokens. Create one in your browser or initialize via terminal.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard/projects/new"
            className="bg-text-primary text-bg-primary hover:bg-brand-primary hover:text-white font-mono text-xs font-bold uppercase px-4 py-2 border-brutal shadow-brutal active:translate-y-0.5 active:shadow-none transition-all pixel-corners cursor-pointer"
          >
            + Create New Vault
          </Link>
          <code className="text-xs text-brand-dark font-mono bg-brand-soft border border-brand-primary/30 px-3 py-2">
            $ cloak-env init
          </code>
        </div>
      </div>
    </div>
  );
}
