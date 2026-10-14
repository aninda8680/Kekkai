/**
 * Dashboard layout — upgraded with:
 * - Full sidebar navigation (Projects, Audit Logs, Settings)
 * - Logout action
 * - Keyboard shortcut hint (Cmd+K)
 *
 * Security note: This layout never imports or renders a /reveal endpoint client.
 * The frontend API client (actions.ts) has no method that calls /reveal — enforced
 * by construction, not by hiding a button.
 */
import Link from "next/link";
import React from "react";
import { logout, getProjects } from "../actions";
import { CommandPalette } from "../../components/CommandPalette";
import { SidebarNav } from "./SidebarNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const projects = await getProjects();
  
  return (
    <div className="fixed inset-0 overflow-hidden bg-bg-primary text-text-primary flex font-sans selection:bg-brand-soft selection:text-brand-dark">
      {/* Sidebar */}
      <aside className="w-60 lg:w-64 h-full border-r border-border-primary bg-bg-surface hidden md:flex flex-col shrink-0 select-none">
        {/* Logo matching landing page and header height */}
        <div className="h-14 px-5 lg:px-6 border-b border-border-primary flex items-center shrink-0">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-5 h-5 bg-brand-primary pixel-corners group-hover:bg-brand-bright transition-colors" />
            <span className="font-display font-bold text-base lg:text-lg tracking-tight uppercase">Cloak-Env</span>
          </Link>
        </div>

        {/* Dynamic Navigation */}
        <SidebarNav />

        {/* Security callout */}
        <div className="mx-3 mb-3 p-2.5 bg-brand-soft border border-brand-primary/20 pixel-corners shrink-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 bg-brand-primary" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-brand-dark">ZERO-TRUST</span>
          </div>
          <p className="text-[10px] lg:text-[11px] text-brand-dark leading-relaxed font-mono">
            CLI-first vault. Secret values decrypt only in terminal.
          </p>
          <code className="mt-1.5 block text-[10px] text-brand-dark font-mono bg-bg-primary border border-border-primary px-2 py-0.5">
            cloak-env get KEY_NAME
          </code>
        </div>

        {/* User footer */}
        <div className="p-3 border-t border-border-primary shrink-0">
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-2.5 py-2 bg-bg-secondary hover:bg-bg-elevated border border-border-primary transition-colors text-left group pixel-corners cursor-pointer"
              id="logout-button"
            >
              <div className="w-7 h-7 border border-border-primary bg-brand-soft flex items-center justify-center text-[11px] font-bold shrink-0 font-mono text-brand-dark pixel-corners">
                CLI
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold font-mono text-text-primary uppercase truncate">Developer</p>
                <p className="text-[10px] text-text-secondary group-hover:text-brand-primary transition-colors font-mono">Sign out</p>
              </div>
              <svg className="w-3.5 h-3.5 text-text-secondary group-hover:text-text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Area with Dashboard Top Header */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-14 border-b border-border-primary bg-bg-surface/80 backdrop-blur-md px-4 sm:px-6 md:px-8 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="font-mono text-xs font-bold text-brand-dark bg-brand-soft uppercase tracking-widest border border-brand-primary/20 px-2.5 py-0.5 inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-primary animate-pulse" />
              CONSOLE
            </div>
            <span className="text-text-muted text-xs font-mono hidden sm:inline">/</span>
            <span className="text-text-secondary text-xs font-mono hidden sm:inline">developer.vault</span>
          </div>

          {/* Quick links & mobile nav */}
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex md:hidden items-center gap-1 font-mono text-[11px]">
              <Link href="/dashboard" className="px-2 py-1 text-text-secondary hover:text-text-primary">Projects</Link>
              <Link href="/dashboard/audit" className="px-2 py-1 text-text-secondary hover:text-text-primary">Audit</Link>
              <Link href="/dashboard/settings" className="px-2 py-1 text-text-secondary hover:text-text-primary">Settings</Link>
            </div>
            <Link
              href="/"
              className="font-mono text-xs text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Website
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 relative">
          {children}
        </main>
      </div>

      <CommandPalette projects={projects} />
    </div>
  );
}
