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
    <div className="max-w-xl mx-auto py-1 sm:py-2 md:py-3 space-y-4">
      <Link
        href="/dashboard"
        className="text-text-secondary hover:text-text-primary flex items-center gap-2 font-mono text-xs transition-colors w-fit"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Projects
      </Link>

      <div className="border-brutal bg-bg-surface shadow-brutal overflow-hidden">
        {/* Window Title Bar */}
        <div className="h-8 bg-bg-secondary border-b border-border-primary flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-border-primary" />
            <div className="w-2 h-2 rounded-full bg-border-primary" />
            <div className="w-2 h-2 rounded-full bg-border-primary" />
          </div>
          <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">
            vault // new-project
          </span>
        </div>

        <div className="p-5 md:p-6 border-b border-border-primary bg-bg-secondary/40">
          <div className="font-mono text-[10px] font-bold text-brand-dark bg-brand-soft uppercase tracking-widest mb-1.5 border border-brand-primary/20 px-2 py-0.5 inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-brand-primary" />
            VAULT CREATION
          </div>
          <h1 className="text-xl md:text-2xl font-display font-extrabold uppercase tracking-tight text-text-primary">
            Create New Vault
          </h1>
          <p className="text-text-secondary text-xs font-sans mt-0.5 leading-relaxed">
            A project vault holds encrypted environment variables and configurations for your service.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-mono p-2.5 border-l-4 border-l-red-500 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="name" className="block font-mono text-xs font-bold uppercase tracking-wider text-text-secondary">
              Vault Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. backend-api"
              required
              className="w-full bg-bg-primary border border-border-primary px-3.5 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary font-mono text-sm transition-all"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-border-primary">
            <Link 
              href="/dashboard"
              className="font-mono text-xs font-bold uppercase text-text-secondary hover:text-text-primary px-3 py-2 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="bg-text-primary text-bg-primary hover:bg-brand-primary hover:text-white font-mono text-xs font-bold uppercase px-5 py-2 border-brutal shadow-brutal active:translate-y-0.5 active:shadow-none transition-all pixel-corners disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "Creating..." : "Create Vault →"}
            </button>
          </div>
        </form>
      </div>

      <div className="border-brutal bg-bg-surface shadow-brutal p-4 flex items-center gap-3.5">
        <div className="w-8 h-8 bg-brand-soft border border-brand-primary/30 flex items-center justify-center shrink-0 pixel-corners">
          <svg className="w-4 h-4 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold uppercase text-text-primary text-xs tracking-tight">CLI Alternative</p>
          <p className="text-[11px] text-text-secondary leading-tight font-sans">
            You can also initialize vaults directly from your terminal.
          </p>
        </div>
        <code className="text-xs text-brand-dark font-mono bg-brand-soft border border-brand-primary/20 px-2.5 py-1 shrink-0 select-all">
          cloak-env init
        </code>
      </div>
    </div>
  );
}
