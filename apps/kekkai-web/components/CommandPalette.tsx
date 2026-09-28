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
    <div className="fixed inset-0 bg-black/80 z-50 flex pt-[20vh] justify-center px-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div 
        className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <Command label="Command Menu" className="flex flex-col w-full h-full bg-transparent text-white" shouldFilter={true}>
          <div className="flex items-center px-4 border-b border-neutral-800">
            <svg className="w-5 h-5 text-neutral-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Command.Input 
              placeholder="Type a command or search..." 
              className="w-full bg-transparent py-4 outline-none text-white placeholder-neutral-500" 
              autoFocus
            />
            <button className="px-2 py-1 bg-neutral-800 text-neutral-400 text-xs rounded border border-neutral-700 ml-2" onClick={() => setOpen(false)}>
              ESC
            </button>
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-neutral-500">No results found.</Command.Empty>
            
            <Command.Group heading="Navigation" className="px-2 py-1 text-xs font-medium text-neutral-500 mb-2">
              <Command.Item 
                onSelect={() => { router.push('/dashboard'); setOpen(false); }}
                className="px-3 py-2.5 rounded-lg text-sm text-neutral-300 hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer flex items-center mb-1"
              >
                Dashboard Home
              </Command.Item>
              <Command.Item 
                onSelect={() => { router.push('/dashboard/audit'); setOpen(false); }}
                className="px-3 py-2.5 rounded-lg text-sm text-neutral-300 hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer flex items-center mb-1"
              >
                Audit Logs
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Projects" className="px-2 py-1 text-xs font-medium text-neutral-500 mb-2">
              {projects.map((p) => (
                <Command.Item 
                  key={p.id}
                  onSelect={() => { router.push(`/dashboard/projects/${p.id}`); setOpen(false); }}
                  className="px-3 py-2.5 rounded-lg text-sm text-neutral-300 hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer flex items-center mb-1"
                >
                  <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-purple-600 mr-3 flex items-center justify-center text-[10px] font-bold text-white">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  {p.name}
                </Command.Item>
              ))}
            </Command.Group>
            
            <Command.Group heading="Actions" className="px-2 py-1 text-xs font-medium text-neutral-500">
              <Command.Item 
                onSelect={() => { router.push('/cli/authorize'); setOpen(false); }}
                className="px-3 py-2.5 rounded-lg text-sm text-neutral-300 hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer flex items-center"
              >
                Authorize CLI Device
              </Command.Item>
            </Command.Group>

          </Command.List>
        </Command>
      </div>
    </div>
  );
}
