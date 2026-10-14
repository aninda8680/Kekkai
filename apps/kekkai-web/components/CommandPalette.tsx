'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CommandPalette({ projects }: { projects: any[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex pt-[18vh] justify-center px-4 backdrop-blur-xs" onClick={() => setOpen(false)}>
      <div 
        className="w-full max-w-xl border-brutal bg-bg-surface shadow-brutal pixel-corners overflow-hidden flex flex-col max-h-[460px]"
        onClick={e => e.stopPropagation()}
      >
        {/* 3-dot window bar */}
        <div className="h-8 bg-bg-secondary border-b border-border-primary flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
            <span className="text-[11px] font-mono text-text-muted ml-2">quick // command-palette</span>
          </div>
          <span className="text-[10px] font-mono text-text-muted">ESC to close</span>
        </div>

        <Command label="Command Menu" className="flex flex-col w-full h-full bg-transparent text-text-primary" shouldFilter={true}>
          <div className="flex items-center px-4 border-b border-border-primary bg-bg-primary">
            <svg className="w-4 h-4 text-text-secondary mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Command.Input 
              placeholder="Type command or search vault..." 
              className="w-full bg-transparent py-3.5 outline-none text-text-primary placeholder-text-muted font-mono text-xs" 
              autoFocus
            />
            <button className="px-2 py-0.5 bg-bg-secondary text-text-secondary text-[10px] font-mono border border-border-primary pixel-corners ml-2 cursor-pointer" onClick={() => setOpen(false)}>
              ESC
            </button>
          </div>

          <Command.List className="overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-xs font-mono text-text-secondary">
              No matching commands or vaults found.
            </Command.Empty>
            
            <Command.Group heading="Navigation" className="px-2 py-1 text-[10px] font-mono font-bold uppercase text-text-muted mb-2">
              <Command.Item 
                onSelect={() => { router.push('/dashboard'); setOpen(false); }}
                className="px-3 py-2 text-xs font-mono text-text-primary hover:bg-brand-soft hover:text-brand-dark cursor-pointer flex items-center mb-1 pixel-corners transition-colors"
              >
                Dashboard Overview
              </Command.Item>
              <Command.Item 
                onSelect={() => { router.push('/dashboard/audit'); setOpen(false); }}
                className="px-3 py-2 text-xs font-mono text-text-primary hover:bg-brand-soft hover:text-brand-dark cursor-pointer flex items-center mb-1 pixel-corners transition-colors"
              >
                Security Audit Logs
              </Command.Item>
              <Command.Item 
                onSelect={() => { router.push('/dashboard/settings'); setOpen(false); }}
                className="px-3 py-2 text-xs font-mono text-text-primary hover:bg-brand-soft hover:text-brand-dark cursor-pointer flex items-center mb-1 pixel-corners transition-colors"
              >
                Sessions & Authorized Devices
              </Command.Item>
            </Command.Group>

            {projects && projects.length > 0 && (
              <Command.Group heading="Projects" className="px-2 py-1 text-[10px] font-mono font-bold uppercase text-text-muted mb-2">
                {projects.map((p) => (
                  <Command.Item 
                    key={p.id}
                    onSelect={() => { router.push(`/dashboard/projects/${p.id}`); setOpen(false); }}
                    className="px-3 py-2 text-xs font-mono text-text-primary hover:bg-brand-soft hover:text-brand-dark cursor-pointer flex items-center mb-1 pixel-corners transition-colors"
                  >
                    <div className="w-4 h-4 bg-brand-primary mr-2.5 flex items-center justify-center text-[9px] font-bold text-white pixel-corners">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    {p.name}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            
            <Command.Group heading="Actions" className="px-2 py-1 text-[10px] font-mono font-bold uppercase text-text-muted">
              <Command.Item 
                onSelect={() => { router.push('/dashboard/projects/new'); setOpen(false); }}
                className="px-3 py-2 text-xs font-mono text-text-primary hover:bg-brand-soft hover:text-brand-dark cursor-pointer flex items-center pixel-corners transition-colors"
              >
                + Create New Project
              </Command.Item>
            </Command.Group>

          </Command.List>
        </Command>
      </div>
    </div>
  );
}
