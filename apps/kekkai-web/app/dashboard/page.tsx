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
          <p className="text-gray-400 text-sm">
            Manage your vaults. Secret values are only accessible via the CLI.
          </p>
        </div>
        <Link
          href="/dashboard/projects/new"
          id="new-project-button"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 flex items-center gap-2"
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
      <div className="rounded-xl border border-white/8 bg-white/3 p-5 flex items-start gap-4">
        <div className="w-9 h-9 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-white mb-1">CLI-first by design</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Secret values never render in a browser — this is a core security guarantee. Use the CLI to read or manage individual values:
          </p>
          <code className="mt-2 block text-xs text-indigo-300 font-mono bg-black/50 border border-white/8 rounded px-3 py-2">
            kekkai get JWT_SECRET --env production
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
      className="group bg-white/4 border border-white/8 rounded-xl p-5 hover:bg-white/6 hover:border-white/14 transition-all cursor-pointer relative overflow-hidden block"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/8 rounded-full blur-[50px] group-hover:bg-indigo-500/15 transition-all pointer-events-none" />

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/30 to-purple-600/30 border border-white/15 flex items-center justify-center">
          <span className="font-bold text-sm uppercase">{project.name.charAt(0)}</span>
        </div>
        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
          Active
        </span>
      </div>

      <h3 className="text-base font-semibold mb-0.5 relative z-10">{project.name}</h3>
      <p className="text-xs text-gray-500 mb-4 font-mono relative z-10">{project.slug}</p>

      <div className="flex items-center justify-between pt-3.5 border-t border-white/8 text-xs text-gray-400 relative z-10">
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
      className="bg-transparent border border-dashed border-white/15 rounded-xl p-5 flex flex-col items-center justify-center text-center hover:border-indigo-500/40 hover:bg-indigo-500/4 transition-all cursor-pointer group min-h-[180px]"
    >
      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-indigo-500/15 group-hover:text-indigo-400 transition-colors">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <h3 className="text-sm font-medium mb-1 group-hover:text-indigo-300 transition-colors">New project</h3>
      <p className="text-xs text-gray-500">Or via CLI: <code className="font-mono">kekkai init</code></p>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold mb-2">No projects yet</h2>
      <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
        Projects hold your environments and secrets. Create one from the CLI or here.
      </p>
      <code className="inline-block text-sm text-indigo-300 font-mono bg-black/50 border border-white/8 rounded px-4 py-2 mb-4">
        kekkai init
      </code>
    </div>
  );
}
