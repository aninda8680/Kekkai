import React from "react";
import Link from "next/link";
import { getProject, getEnvironments } from "../../../actions";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const resolvedParams = await params;
  const project = await getProject(resolvedParams.projectId);
  const environments = await getEnvironments(resolvedParams.projectId);
  
  if (!project) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <div className="inline-block p-8 border-brutal bg-bg-surface shadow-brutal pixel-corners">
          <h1 className="text-2xl font-display font-extrabold uppercase mb-4 text-text-primary">Project Not Found</h1>
          <p className="text-sm font-mono text-text-secondary mb-6">The requested vault does not exist or has been deleted.</p>
          <Link 
            href="/dashboard" 
            className="font-mono text-xs font-bold uppercase bg-text-primary text-bg-primary px-4 py-2 border-brutal shadow-brutal hover:bg-brand-primary hover:text-white transition-all inline-block"
          >
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Calculate total secrets across all environments
  let totalSecrets = 0;
  if (environments && environments.length > 0) {
    for (const env of environments) {
      totalSecrets += env.secretCount || 0;
    }
  }

  const isNewProject = totalSecrets === 0;

  return (
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 md:pb-4 border-b border-border-primary">
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard" 
            className="w-8 h-8 border-brutal bg-bg-surface hover:bg-bg-secondary flex items-center justify-center transition-colors pixel-corners text-text-primary"
            title="Back to dashboard"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-[10px] font-bold text-brand-dark bg-brand-soft px-2 py-0.5 border border-brand-primary/20 uppercase">
                VAULT // PROJECT
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-display font-extrabold uppercase tracking-tight text-text-primary">
              {project.name}
            </h1>
            <p className="text-text-secondary font-mono text-[11px] mt-0.5">slug: {project.slug}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/projects/${project.id}/settings/tokens`}
            className="font-mono text-xs font-bold uppercase px-3.5 py-2 border-brutal bg-bg-surface hover:bg-bg-secondary text-text-primary shadow-brutal transition-all pixel-corners flex items-center gap-2"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Service Tokens
          </Link>
        </div>
      </div>

      {isNewProject ? (
        <OnboardingWizard projectName={project.name} />
      ) : (
        <ProjectDashboard project={project} environments={environments} />
      )}
    </div>
  );
}

function OnboardingWizard({ projectName }: { projectName: string }) {
  return (
    <div className="border-brutal bg-bg-surface shadow-brutal pixel-corners overflow-hidden">
      {/* 3-dot window bar */}
      <div className="h-8 bg-bg-secondary border-b border-border-primary flex items-center px-4 gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
        <span className="text-[11px] font-mono text-text-muted ml-2">cli // setup-guide</span>
      </div>

      <div className="p-4 md:p-6 border-b border-border-primary bg-brand-soft/20">
        <div className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold text-brand-dark bg-brand-soft px-2 py-0.5 border border-brand-primary/20 uppercase mb-2">
          <span className="w-1.5 h-1.5 bg-brand-primary"></span>
          READY FOR CLI SYNC
        </div>
        <h2 className="text-lg md:text-xl font-display font-extrabold uppercase text-text-primary mb-1">
          Project Created Successfully
        </h2>
        <p className="text-text-secondary text-xs sm:text-sm font-sans max-w-2xl leading-relaxed">
          Follow these steps to connect your local development environment. CLOAK-ENV is CLI-first: values never render in the browser.
        </p>
      </div>
      
      <div className="p-4 md:p-6 space-y-4">
        <Step 
          number={1} 
          title="Install CLI" 
          command="npm install -g cloak-env" 
          desc="Global installation for development and CI runners."
        />
        <Step 
          number={2} 
          title="Authenticate" 
          command="cloak-env auth login" 
          desc="Opens a browser window for zero-trust device authorization."
        />
        <Step 
          number={3} 
          title="Initialize Project" 
          command="cloak-env init" 
          desc={`Select "${projectName}" when prompted.`}
        />
        <Step 
          number={4} 
          title="Push Secrets" 
          command="cloak-env push" 
          desc="Encrypts and syncs your local .env file directly into the cloud vault."
        />
        <Step 
          number={5} 
          title="Run Application" 
          command="cloak-env run npm run dev" 
          desc="Injects decrypted secrets into process memory without touching disk."
        />
      </div>
    </div>
  );
}

function Step({ number, title, command, desc }: { number: number; title: string; command: string; desc?: string }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pb-4 border-b border-border-primary/50 last:border-0 last:pb-0">
      <div className="w-7 h-7 shrink-0 bg-brand-soft text-brand-dark flex items-center justify-center font-mono font-bold border border-brand-primary/30 pixel-corners text-xs">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-xs md:text-sm font-bold uppercase font-display tracking-tight text-text-primary mb-0.5">{title}</h3>
        {desc && <p className="text-[11px] text-text-secondary mb-1.5 font-sans leading-tight">{desc}</p>}
        <div className="flex items-center justify-between bg-bg-primary border border-border-primary px-3 py-2 pixel-corners">
          <code className="font-mono text-xs text-text-primary select-all truncate">{command}</code>
          <span className="text-[9px] font-mono text-brand-dark bg-brand-soft px-1.5 py-0.5 border border-brand-primary/20 uppercase shrink-0 ml-2">
            terminal
          </span>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProjectDashboard({ project, environments }: { project: any; environments: any[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
      <div className="col-span-1 lg:col-span-2 space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg font-display font-extrabold uppercase tracking-tight text-text-primary">
            Environments
          </h2>
          <span className="font-mono text-xs text-text-secondary">
            {environments?.length || 0} active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {environments?.map((env: any) => (
            <Link 
              key={env.id}
              href={`/dashboard/projects/${project.id}/environments/${env.id}/secrets`}
              className="border-brutal bg-bg-surface p-4 hover:bg-bg-secondary/40 shadow-brutal transition-all pixel-corners group block"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-mono font-bold capitalize text-text-primary text-sm group-hover:text-brand-primary transition-colors">
                  {env.name}
                </h3>
                <span className="text-[11px] font-mono font-bold bg-brand-soft text-brand-dark px-2 py-0.5 border border-brand-primary/20 uppercase">
                  {env.secretCount || 0} secrets
                </span>
              </div>
              <p className="text-[10px] text-text-muted font-mono truncate">ID: {env.id}</p>
              <div className="mt-3 pt-2.5 border-t border-border-primary flex items-center justify-between text-xs font-mono text-text-secondary group-hover:text-text-primary">
                <span>View secrets</span>
                <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="col-span-1 space-y-3.5">
        <h2 className="text-base md:text-lg font-display font-extrabold uppercase tracking-tight text-text-primary">
          Project Info
        </h2>
        
        <div className="border-brutal bg-bg-surface p-4 shadow-brutal pixel-corners space-y-3 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary font-mono uppercase">Created</span>
            <span className="font-mono font-bold text-text-primary">{new Date(project.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary font-mono uppercase">Vault ID</span>
            <span className="font-mono text-[11px] text-text-primary truncate max-w-[130px] bg-bg-secondary px-2 py-0.5 border border-border-primary" title={project.id}>
              {project.id}
            </span>
          </div>

          <hr className="border-border-primary" />

          <div>
            <h3 className="font-mono font-bold text-[11px] uppercase mb-1.5 text-text-primary">CLI Access</h3>
            <div className="space-y-1.5">
              <code className="block bg-bg-primary border border-border-primary p-1.5 text-[11px] font-mono overflow-hidden text-ellipsis whitespace-nowrap text-text-primary">
                cloak-env env list
              </code>
              <code className="block bg-bg-primary border border-border-primary p-1.5 text-[11px] font-mono overflow-hidden text-ellipsis whitespace-nowrap text-text-primary">
                cloak-env status
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
