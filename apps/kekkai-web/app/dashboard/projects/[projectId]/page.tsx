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
        <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
        <Link href="/dashboard" className="text-indigo-400 hover:underline">
          &larr; Back to Dashboard
        </Link>
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
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-gray-400 font-mono text-xs">{project.slug}</p>
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
    <div className="bg-[#111512] border border-[#2B332D] rounded-xl overflow-hidden shadow-[4px_4px_0_0_#183C29]">
      <div className="p-8 border-b border-[#2B332D] bg-[#161B17]">
        <h2 className="text-xl font-bold mb-2">Project Created Successfully</h2>
        <p className="text-gray-400 text-sm">
          Follow these steps to connect your local development environment. Cloak-Env is CLI-first.
        </p>
      </div>
      
      <div className="p-8 space-y-8">
        <Step 
          number={1} 
          title="Install CLI" 
          command="npm install -g cloak-env" 
        />
        <Step 
          number={2} 
          title="Authenticate" 
          command="cloak-env auth login" 
          desc="This will open a browser window for device authorization."
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
          desc="Encrypts and syncs your local .env file to the cloud vault."
        />
        <Step 
          number={5} 
          title="Run Application" 
          command="cloak-env run npm run dev" 
          desc="Injects secrets directly into your application process."
        />
      </div>
    </div>
  );
}

function Step({ number, title, command, desc }: { number: number, title: string, command: string, desc?: string }) {
  return (
    <div className="flex gap-6">
      <div className="w-8 h-8 shrink-0 rounded-none bg-[#183C29] text-[#79C88D] flex items-center justify-center font-mono font-bold border border-[#79C88D] clip-pixel">
        {number}
      </div>
      <div className="flex-1">
        <h3 className="text-base font-semibold mb-1">{title}</h3>
        {desc && <p className="text-sm text-gray-400 mb-3">{desc}</p>}
        <div className="flex items-center justify-between bg-black border border-[#2B332D] p-3 rounded-md">
          <code className="font-mono text-sm text-[#F0F2EA]">{command}</code>
          {/* Note: In a real app we'd have a client-side copy button here */}
          <button className="text-gray-500 hover:text-[#79C88D] transition-colors" title="Copy to clipboard">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProjectDashboard({ project, environments }: { project: any, environments: any[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="col-span-1 lg:col-span-2 space-y-6">
        <h2 className="text-lg font-bold">Environments</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {environments?.map((env: any) => (
            <Link 
              key={env.id}
              href={`/dashboard/projects/${project.id}/environments/${env.id}/secrets`}
              className="bg-[#111512] border border-[#2B332D] p-5 hover:bg-[#161B17] hover:border-[#79C88D] transition-all group rounded-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-mono font-bold capitalize">{env.name}</h3>
                <span className="text-xs bg-[#183C29] text-[#79C88D] px-2 py-1 rounded">
                  {env.secretCount || 0} secrets
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono">ID: {env.id}</p>
            </Link>
          ))}
        </div>
      </div>
      <div className="col-span-1 space-y-6">
         <h2 className="text-lg font-bold">Project Info</h2>
         <div className="bg-[#111512] border border-[#2B332D] p-5 rounded-lg space-y-4 text-sm">
           <div className="flex justify-between">
             <span className="text-gray-400">Created</span>
             <span className="font-mono">{new Date(project.createdAt).toLocaleDateString()}</span>
           </div>
           <div className="flex justify-between">
             <span className="text-gray-400">ID</span>
             <span className="font-mono text-xs truncate max-w-[120px]">{project.id}</span>
           </div>
           <hr className="border-[#2B332D]" />
           <div>
             <h3 className="font-bold mb-2">CLI Access</h3>
             <code className="block bg-black border border-[#2B332D] p-2 text-xs font-mono mb-2 overflow-hidden text-ellipsis whitespace-nowrap">
               cloak-env env list
             </code>
             <code className="block bg-black border border-[#2B332D] p-2 text-xs font-mono overflow-hidden text-ellipsis whitespace-nowrap">
               cloak-env status
             </code>
           </div>
         </div>
      </div>
    </div>
  );
}
