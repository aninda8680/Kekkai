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

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const projects = await getProjects();
  
  return (
    <div className="min-h-screen bg-[#080808] text-white flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/8 bg-black/60 hidden md:flex flex-col shrink-0 backdrop-blur-xl">
        {/* Logo */}
        <div className="p-6 border-b border-white/8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.4)]">
              <span className="font-bold text-white text-sm">K</span>
            </div>
            <span className="font-semibold tracking-wide text-white/90 group-hover:text-white transition-colors">KEKKAI</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5">
          <NavItem href="/dashboard" icon={<GridIcon />} label="Projects" active />
          <NavItem href="/dashboard/audit" icon={<AuditIcon />} label="Audit Logs" />
          <NavItem href="/dashboard/team" icon={<TeamIcon />} label="Team" />
          <NavItem href="/dashboard/settings" icon={<SettingsIcon />} label="Settings" />
        </nav>

        {/* Security callout */}
        <div className="mx-3 mb-3 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          <p className="text-xs text-indigo-300 leading-relaxed">
            <span className="font-semibold">No plaintext in browser.</span>{" "}
            Use the CLI to access secret values.
          </p>
          <code className="mt-2 block text-xs text-indigo-400 font-mono bg-black/40 rounded px-2 py-1">
            kekkai get KEY_NAME
          </code>
        </div>

        {/* User footer */}
        <div className="p-3 border-t border-white/8">
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/8 border border-white/8 transition-colors text-left group"
              id="logout-button"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-semibold shrink-0">
                U
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">Account</p>
                <p className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">Sign out</p>
              </div>
              <svg className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto relative">
        <div className="absolute top-0 left-0 w-full h-64 bg-indigo-500/3 blur-[120px] pointer-events-none" />
        <div className="p-8 relative z-10">
          {children}
        </div>
      </main>
      <CommandPalette projects={projects} />
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? "bg-white/10 text-white"
          : "text-gray-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className={active ? "text-indigo-400" : "text-gray-500"}>{icon}</span>
      {label}
    </Link>
  );
}

function GridIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}
function AuditIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}
function TeamIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    </svg>
  );
}
