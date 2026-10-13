"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createProject } from "../../../actions";

export default function NewProjectPage() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await createProject(name);
      if (res.error) {
        setError(res.error);
        setLoading(false);
      } else {
        router.push(`/dashboard/projects/${res.id}`);
      }
    } catch {
      setError("Failed to create project");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12">
      <Link href="/dashboard" className="text-gray-400 hover:text-white flex items-center gap-2 mb-8 text-sm transition-colors w-fit">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Dashboard
      </Link>

      <div className="bg-[#111512] border border-[#2B332D] rounded-xl overflow-hidden shadow-[4px_4px_0_0_#183C29]">
        <div className="p-8 border-b border-[#2B332D] bg-[#161B17]">
          <h1 className="text-2xl font-bold mb-2">Create New Project</h1>
          <p className="text-gray-400 text-sm">
            A project contains environments and secrets for a specific application.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-950/30 border border-red-900 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Project Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. kekkai-api"
              required
              className="w-full bg-black border border-[#2B332D] focus:border-[#79C88D] focus:ring-1 focus:ring-[#79C88D] rounded-lg px-4 py-3 text-white transition-all outline-none"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-4">
            <Link 
              href="/dashboard"
              className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#183C29] border border-[#79C88D] text-[#79C88D] hover:bg-[#79C88D] hover:text-[#0B0E0C] px-6 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 rounded-xl border border-white/8 bg-white/3 p-5 flex items-start gap-4">
        <div className="w-9 h-9 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-white mb-1">CLI Alternative</p>
          <p className="text-xs text-gray-400 leading-relaxed mb-2">
            You can also create a new project directly from your terminal.
          </p>
          <code className="block text-xs text-indigo-300 font-mono bg-black/50 border border-white/8 rounded px-3 py-2">
            cloak-env init
          </code>
        </div>
      </div>
    </div>
  );
}
