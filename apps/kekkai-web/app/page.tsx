import React from "react";
import Link from "next/link";
import { HeroTerminal } from "@/components/marketing/HeroTerminal";


export default function Home() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary selection:bg-brand-soft selection:text-brand-dark overflow-x-hidden font-sans">
      
      {/* 6. NAVBAR */}
      <header className="w-full bg-bg-surface/80 backdrop-blur-md sticky top-0 z-50 border-b border-border-primary transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-brand-primary pixel-corners"></div>
            <span className="font-display font-bold text-lg tracking-tight uppercase">Cloak-Env</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 font-mono text-sm font-medium">
            <Link href="#product" className="text-text-secondary hover:text-text-primary transition-colors">Product</Link>
            <Link href="#security" className="text-text-secondary hover:text-text-primary transition-colors">Security</Link>
            <Link href="#cli" className="text-text-secondary hover:text-text-primary transition-colors">CLI</Link>
            <Link href="/docs" className="text-text-secondary hover:text-text-primary transition-colors">Docs</Link>
          </nav>

          <div className="hidden md:flex items-center gap-6">
            <Link href="https://github.com/aninda8680/Kekkai" target="_blank" rel="noopener" className="text-text-secondary hover:text-text-primary transition-colors">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            </Link>
            <Link href="/login" className="font-mono text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">Log in</Link>
            <Link href="/dashboard" className="font-mono text-sm bg-text-primary text-bg-primary px-4 py-2 pixel-corners hover:bg-brand-primary hover:text-white transition-colors shadow-sm">
              Get Started
            </Link>
          </div>
          
          <button className="md:hidden text-text-primary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>
      </header>

      <main>
        {/* 7. HERO — FIRST SCREEN */}
        <section className="relative px-6 py-20 md:py-32 max-w-7xl mx-auto overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            
            <div className="w-full lg:w-[55%] flex flex-col items-start z-10">
              <div className="font-mono text-xs font-bold text-brand-dark bg-brand-soft uppercase tracking-widest mb-8 border border-brand-primary/20 px-3 py-1 inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-brand-primary"></span>
                CLOAK-ENV / DEVELOPER SECURITY
              </div>
              
              <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tighter mb-8 text-text-primary uppercase leading-[0.85] text-balance">
                COMING SOON
              </h1>
              
              <p className="text-lg md:text-xl text-text-secondary max-w-xl mb-12 font-sans leading-relaxed">
                A zero-trust secret and environment management platform. 
                Synchronize across your team and inject directly into runtime. 
                Stop shipping your <code className="font-mono bg-bg-secondary px-1 py-0.5 text-text-primary">.env</code> file.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <div className="w-full sm:w-auto font-mono text-sm font-bold bg-text-primary text-bg-primary px-8 py-4 shadow-brutal border-brutal opacity-50 cursor-not-allowed">
                  Coming Soon
                </div>
              </div>
              
              <div className="mt-8 flex gap-6 font-mono text-xs text-text-muted uppercase tracking-wider">
                <span className="flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> CLI-FIRST</span>
                <span className="flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> ZERO-TRUST</span>
                <span className="flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> OPEN SOURCE</span>
              </div>
            </div>

            <div className="w-full lg:w-[45%] relative z-10">
              <div className="relative border-brutal bg-bg-surface shadow-brutal overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-8 bg-bg-secondary border-b border-border-primary flex items-center px-4 gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
                </div>
                <div className="pt-8 w-full h-full">
                  <HeroTerminal />
                </div>
              </div>
              
              {/* 9. HERO PIXEL ART / ACCENTS */}
              <div className="absolute -top-12 -right-8 w-24 h-24 bg-brand-soft/50 -z-10 pixel-corners border border-brand-primary/20"></div>
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-accent-yellow/20 -z-10 pixel-corners border border-accent-yellow/50"></div>
            </div>
            
          </div>
        </section>
      </main>

      {/* 36. FOOTER */}
      <footer className="border-t border-border-primary bg-bg-surface py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-6 h-6 bg-brand-dark pixel-corners"></div>
                <span className="font-display font-bold text-xl tracking-tight uppercase">Cloak-Env</span>
              </div>
              <p className="text-sm font-sans text-text-secondary max-w-xs">
                Secure environment management for developers.
                Zero-trust, CLI-first, professional grade.
              </p>
            </div>
            
            <div>
              <h4 className="font-mono font-bold text-sm uppercase mb-6 tracking-widest">Product</h4>
              <ul className="space-y-4 font-sans text-sm text-text-secondary">
                <li><Link href="#security" className="hover:text-brand-primary transition-colors">Security</Link></li>
                <li><Link href="#cli" className="hover:text-brand-primary transition-colors">CLI Workflow</Link></li>
                <li><Link href="/dashboard" className="hover:text-brand-primary transition-colors">Dashboard</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-mono font-bold text-sm uppercase mb-6 tracking-widest">Resources</h4>
              <ul className="space-y-4 font-sans text-sm text-text-secondary">
                <li><Link href="/docs" className="hover:text-brand-primary transition-colors">Documentation</Link></li>
                <li><Link href="https://github.com/aninda8680/Kekkai" className="hover:text-brand-primary transition-colors">GitHub</Link></li>
                <li><Link href="/api" className="hover:text-brand-primary transition-colors">API Reference</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-mono font-bold text-sm uppercase mb-6 tracking-widest">Company</h4>
              <ul className="space-y-4 font-sans text-sm text-text-secondary">
                <li><Link href="/about" className="hover:text-brand-primary transition-colors">About</Link></li>
                <li><Link href="/contact" className="hover:text-brand-primary transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border-primary pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="font-mono text-xs text-text-secondary flex items-center gap-2">
              <div className="w-2 h-2 bg-text-muted pixel-corners"></div>
              © {new Date().getFullYear()} CLOAK-ENV
            </div>
            <div className="flex gap-6 font-mono text-xs">
              <Link href="/privacy" className="text-text-secondary hover:text-text-primary">Privacy</Link>
              <Link href="/terms" className="text-text-secondary hover:text-text-primary">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
