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
              
              <h1 className="text-6xl md:text-[5.5rem] font-display font-extrabold tracking-tighter mb-8 text-text-primary uppercase leading-[0.85] text-balance">
                Secrets that stay<br/>
                <span className="text-brand-primary">out of your way.</span>
              </h1>
              
              <p className="text-lg md:text-xl text-text-secondary max-w-xl mb-12 font-sans leading-relaxed">
                A zero-trust secret and environment management platform. 
                Synchronize across your team and inject directly into runtime. 
                Stop shipping your <code className="font-mono bg-bg-secondary px-1 py-0.5 text-text-primary">.env</code> file.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <Link href="/dashboard" className="w-full sm:w-auto font-mono text-sm font-bold bg-text-primary text-bg-primary px-8 py-4 shadow-brutal border-brutal hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0_0_var(--brand-primary)] hover:bg-brand-primary transition-all">
                  Get Started
                </Link>
                <Link href="/docs" className="w-full sm:w-auto font-mono text-sm font-bold bg-bg-surface text-text-primary px-8 py-4 border-brutal hover:bg-bg-secondary transition-colors">
                  Read Documentation
                </Link>
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

        {/* 10. TRUST STRIP */}
        <section className="border-y border-border-primary bg-bg-secondary py-6 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between font-mono text-xs md:text-sm font-bold text-text-muted tracking-widest uppercase flex-wrap gap-y-4">
            <span>Zero-Trust Architecture</span>
            <span className="hidden md:inline text-border-primary">•</span>
            <span>AES-256-GCM</span>
            <span className="hidden md:inline text-border-primary">•</span>
            <span>RBAC</span>
            <span className="hidden md:inline text-border-primary">•</span>
            <span>Audit Logs</span>
            <span className="hidden md:inline text-border-primary">•</span>
            <span>Runtime Injection</span>
          </div>
        </section>

        {/* 11. PROBLEM SECTION */}
        <section className="px-6 py-32 max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-display font-extrabold uppercase tracking-tight text-text-primary">
              .env files were never<br/>designed for teams.
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center items-start">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 mb-6 border-brutal bg-bg-surface flex items-center justify-center font-mono font-bold text-xl relative">
                Dev 1
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[2px] h-6 bg-border-primary"></div>
              </div>
              <div className="w-16 h-8 bg-brand-soft border border-brand-primary/30 flex items-center justify-center font-mono text-xs text-brand-dark mb-6">.env</div>
              <div className="text-sm text-text-secondary">Sent via Slack</div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 mb-6 border-brutal bg-bg-surface flex items-center justify-center font-mono font-bold text-xl relative">
                Dev 2
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[2px] h-6 bg-border-primary"></div>
              </div>
              <div className="w-16 h-8 bg-accent-yellow/20 border border-accent-yellow/50 flex items-center justify-center font-mono text-xs text-text-primary mb-6">.env</div>
              <div className="text-sm text-text-secondary">Copy-pasted from email</div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 mb-6 border-brutal bg-bg-surface flex items-center justify-center font-mono font-bold text-xl relative">
                Production
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[2px] h-6 bg-border-primary"></div>
              </div>
              <div className="w-16 h-8 bg-accent-orange/20 border border-accent-orange/50 flex items-center justify-center font-mono text-xs text-text-primary mb-6">.env</div>
              <div className="text-sm text-text-secondary">Out of sync</div>
            </div>
          </div>
          
          <div className="mt-24 text-center">
            <p className="font-mono text-xl font-bold uppercase tracking-widest text-text-primary">
              The Consequence:
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4 font-mono text-sm text-text-secondary">
              <span className="bg-bg-secondary px-4 py-2 border border-border-primary">DRIFT</span>
              <span className="bg-bg-secondary px-4 py-2 border border-border-primary">LEAKS</span>
              <span className="bg-bg-secondary px-4 py-2 border border-border-primary">CONFUSION</span>
              <span className="bg-bg-secondary px-4 py-2 border border-border-primary">"IT WORKS ON MY MACHINE"</span>
            </div>
          </div>
        </section>

        {/* 12. BEFORE / AFTER */}
        <section className="border-y border-border-primary bg-bg-surface overflow-hidden">
          <div className="flex flex-col lg:flex-row w-full min-h-[60vh]">
            
            {/* BEFORE */}
            <div className="w-full lg:w-1/2 p-12 lg:p-24 border-b lg:border-b-0 lg:border-r border-border-primary flex flex-col justify-center bg-bg-primary/50 relative">
              <h3 className="font-mono text-text-muted mb-8 font-bold uppercase tracking-widest">Without Cloak-Env</h3>
              <ul className="space-y-6 font-sans text-xl text-text-secondary">
                <li className="flex items-center gap-4"><span className="text-accent-orange">✕</span> .env files everywhere</li>
                <li className="flex items-center gap-4"><span className="text-accent-orange">✕</span> Secrets shared via Slack</li>
                <li className="flex items-center gap-4"><span className="text-accent-orange">✕</span> Manual copying & pasting</li>
                <li className="flex items-center gap-4"><span className="text-accent-orange">✕</span> Environment drift</li>
              </ul>
              
              {/* Subtle background element */}
              <div className="absolute bottom-12 right-12 opacity-10 font-mono text-[10rem] font-bold leading-none select-none">
                ?
              </div>
            </div>

            {/* AFTER */}
            <div className="w-full lg:w-1/2 p-12 lg:p-24 flex flex-col justify-center bg-brand-primary text-white relative">
              <h3 className="font-mono text-brand-soft mb-8 font-bold uppercase tracking-widest">With Cloak-Env</h3>
              <ul className="space-y-6 font-sans text-xl text-brand-soft">
                <li className="flex items-center gap-4"><span className="text-accent-yellow">✓</span> Encrypted cloud vault</li>
                <li className="flex items-center gap-4"><span className="text-accent-yellow">✓</span> Projects & Environments</li>
                <li className="flex items-center gap-4"><span className="text-accent-yellow">✓</span> CLI-first synchronization</li>
                <li className="flex items-center gap-4"><span className="text-accent-yellow">✓</span> Runtime secret injection</li>
              </ul>
              
              {/* Subtle background element */}
              <div className="absolute bottom-12 right-12 opacity-10 font-mono text-[10rem] font-bold leading-none select-none text-brand-dark">
                !
              </div>
            </div>

          </div>
        </section>

        {/* 13. HOW CLOAK-ENV WORKS */}
        <section className="px-6 py-32 max-w-7xl mx-auto bg-bg-primary">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-5xl font-display font-extrabold uppercase tracking-tight text-text-primary">
              The Workflow
            </h2>
          </div>

          <div className="flex flex-col gap-12">
            {[
              { num: "01", title: "CREATE", desc: "Create a secure project workspace.", code: "Dashboard UI" },
              { num: "02", title: "CONNECT", desc: "Link your local machine to the project environment.", code: "$ cloak-env init" },
              { num: "03", title: "SYNC", desc: "Encrypt and push secrets to the vault.", code: "$ cloak-env push" },
              { num: "04", title: "RUN", desc: "Inject secrets securely into the runtime.", code: "$ cloak-env run npm run dev" },
              { num: "05", title: "CONTROL", desc: "Manage access via RBAC and view audit logs.", code: "Dashboard UI" },
            ].map((step, idx) => (
              <div key={idx} className={`flex flex-col md:flex-row gap-8 items-center ${idx % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}>
                <div className="w-full md:w-1/2 p-8 border-brutal bg-bg-surface flex flex-col justify-center shadow-sm hover:shadow-brutal transition-shadow">
                  <div className="font-mono text-brand-primary text-xl font-bold mb-4">STEP {step.num}</div>
                  <h3 className="text-3xl font-display font-bold uppercase tracking-tight mb-4">{step.title}</h3>
                  <p className="text-text-secondary text-lg mb-6">{step.desc}</p>
                  <code className="bg-bg-secondary border border-border-primary px-4 py-3 font-mono text-sm self-start">
                    {step.code}
                  </code>
                </div>
                <div className="w-full md:w-1/2 h-64 border-brutal bg-bg-secondary flex items-center justify-center pixel-corners relative overflow-hidden group">
                  {/* Abstract placeholder for technical illustration */}
                  <div className="font-mono text-border-primary/50 text-8xl font-bold group-hover:scale-110 transition-transform duration-700">
                    {step.num}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 14. SECURITY ARCHITECTURE */}
        <section id="security" className="px-6 py-32 bg-bg-surface border-y border-border-primary">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-24">
              <h2 className="text-4xl md:text-5xl font-display font-extrabold uppercase tracking-tight text-text-primary mb-6">
                Security Architecture
              </h2>
              <p className="text-lg text-text-secondary max-w-2xl mx-auto font-sans">
                The web dashboard manages the project. The CLI handles the secrets. 
                The web dashboard never receives plaintext secret values.
              </p>
            </div>
            
            <div className="w-full max-w-5xl mx-auto">
              {/* Fallback architectural diagram if ArchitectureFlow needs work */}
              <div className="flex flex-col items-center">
                
                {/* Dashboard Level */}
                <div className="w-64 border-brutal bg-bg-elevated p-6 text-center shadow-brutal relative">
                  <div className="absolute -top-3 -right-3 w-6 h-6 bg-accent-orange pixel-corners border-brutal"></div>
                  <h3 className="font-mono font-bold uppercase mb-4 text-text-primary">Web Dashboard</h3>
                  <ul className="text-sm font-mono text-text-secondary space-y-2">
                    <li>Projects</li>
                    <li>Members</li>
                    <li>Environments</li>
                    <li>Audit Logs</li>
                  </ul>
                </div>
                
                {/* Arrow Down */}
                <div className="h-16 w-px bg-border-primary relative my-4">
                  <div className="absolute top-1/2 left-4 -translate-y-1/2 font-mono text-xs text-text-muted">metadata / access</div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-text-primary rotate-45"></div>
                </div>
                
                {/* API Level */}
                <div className="w-80 border-brutal bg-bg-elevated p-6 text-center">
                  <h3 className="font-mono font-bold uppercase mb-4 text-text-primary">Cloak-Env API</h3>
                  <div className="flex justify-center gap-4 text-xs font-mono text-brand-primary">
                    <span className="bg-brand-soft px-2 py-1">RBAC</span>
                    <span className="bg-brand-soft px-2 py-1">Audit</span>
                    <span className="bg-brand-soft px-2 py-1">Sync</span>
                  </div>
                </div>

                {/* Arrow Down */}
                <div className="h-16 w-px bg-border-primary relative my-4">
                  <div className="absolute top-1/2 left-4 -translate-y-1/2 font-mono text-xs text-brand-primary font-bold">encrypted AES-256</div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-text-primary rotate-45"></div>
                </div>

                {/* Vault Level */}
                <div className="w-64 border-brutal bg-text-primary text-bg-primary p-6 text-center pixel-corners shadow-[4px_4px_0_0_var(--brand-primary)]">
                  <h3 className="font-mono font-bold uppercase flex items-center justify-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    Secure Vault
                  </h3>
                </div>

                {/* Flow to Local */}
                <div className="flex w-full max-w-2xl justify-between mt-12 relative border-t-2 border-dashed border-border-primary pt-12">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 font-mono text-xs font-bold text-text-muted bg-bg-surface px-4">LOCAL DEVELOPER MACHINE</div>
                  
                  <div className="w-64 border-brutal bg-bg-elevated p-6 text-center relative z-10 bg-bg-surface">
                    <h3 className="font-mono font-bold uppercase mb-2 text-text-primary">CLI</h3>
                    <p className="text-xs text-text-secondary font-mono">Decrypts secrets locally</p>
                  </div>
                  
                  <div className="h-0.5 w-full bg-border-primary self-center relative z-0">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-text-primary rotate-45"></div>
                  </div>
                  
                  <div className="w-64 border border-brand-primary bg-brand-soft p-6 text-center relative z-10">
                    <h3 className="font-mono font-bold uppercase mb-2 text-brand-dark">Running Process</h3>
                    <p className="text-xs text-brand-primary font-mono">Secrets in memory</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* 15. "RUN WITHOUT .ENV" */}
        <section className="px-6 py-32 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="w-full md:w-1/2">
              <h2 className="text-4xl md:text-5xl font-display font-extrabold uppercase tracking-tight text-text-primary mb-6">
                Run your app.<br/>Keep secrets out of the file system.
              </h2>
              <p className="text-lg text-text-secondary font-sans mb-8">
                The signature <code className="font-mono bg-bg-secondary px-1 text-text-primary">cloak-env run</code> command injects your environment variables directly into the process. 
                They exist only in memory, never written to disk.
              </p>
              <div className="border-brutal bg-text-primary text-bg-primary p-6 font-mono text-sm shadow-brutal">
                $ cloak-env run npm run dev
                <br/><br/>
                <span className="text-brand-primary">✓</span> decrypting environment<br/>
                <span className="text-brand-primary">✓</span> secrets injected<br/>
                <span className="text-text-muted">... Starting development server</span>
              </div>
            </div>
            
            <div className="w-full md:w-1/2 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 border-2 border-brand-primary/20 scale-110 -z-10 rotate-3"></div>
                <div className="absolute inset-0 border-2 border-brand-primary/20 scale-105 -z-10 -rotate-2"></div>
                <div className="border-brutal bg-bg-surface p-8 shadow-brutal relative z-10 min-w-[300px]">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-bg-secondary border border-border-primary flex items-center justify-center pixel-corners">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    </div>
                    <div>
                      <div className="font-mono font-bold uppercase">Memory Injection</div>
                      <div className="text-xs text-text-secondary font-mono">Zero-disk footprint</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-text-muted mb-4 opacity-50">
                    <span className="text-accent-orange font-bold">✕</span> 
                    <span className="line-through font-mono text-sm">Write to .env file</span>
                  </div>
                  <div className="flex items-center gap-4 text-brand-dark">
                    <span className="text-brand-primary font-bold">✓</span> 
                    <span className="font-mono text-sm font-bold bg-brand-soft px-2">Inject securely</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 16. CLI SHOWCASE - Placeholder for interactive tabs */}
        <section id="cli" className="border-y border-border-primary bg-bg-secondary px-6 py-32">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-display font-extrabold uppercase tracking-tight text-center mb-16">
              The Developer Interface
            </h2>
            
            <div className="border-brutal bg-bg-surface shadow-brutal overflow-hidden">
              <div className="flex border-b border-border-primary overflow-x-auto bg-bg-elevated scrollbar-hide">
                {['auth', 'init', 'push', 'pull', 'run', 'status', 'diff'].map((tab, i) => (
                  <button key={tab} className={`px-6 py-4 font-mono text-sm font-bold uppercase whitespace-nowrap border-r border-border-primary transition-colors ${i === 4 ? 'bg-bg-surface text-brand-primary border-b-2 border-b-brand-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'}`}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="p-8 bg-text-primary text-bg-primary font-mono text-sm leading-relaxed min-h-[300px]">
                <div className="text-text-muted mb-4">$ cloak-env run npm run dev</div>
                <div className="text-brand-primary">Authenticating with vault...</div>
                <div className="text-brand-primary">Loading environment: <span className="text-white">development</span></div>
                <div className="text-brand-primary">Injecting secrets...</div>
                <br/>
                <div className="text-brand-bright">✓ environment loaded</div>
                <div className="text-brand-bright">✓ secrets injected</div>
                <div className="text-brand-bright">✓ process started</div>
                <br/>
                <div className="text-white">&gt; Next.js dev server ready on http://localhost:3000</div>
              </div>
            </div>
          </div>
        </section>

        {/* 18. ENVIRONMENT MANAGEMENT & DASHBOARD PREVIEW */}
        <section className="px-6 py-32 max-w-7xl mx-auto overflow-hidden">
          <div className="mb-16 text-center">
            <h2 className="text-3xl md:text-5xl font-display font-extrabold uppercase tracking-tight mb-4">
              Control the chaos
            </h2>
            <p className="text-text-secondary font-sans text-lg">
              Manage projects, environments, and team access from a clean, professional dashboard.
            </p>
          </div>
          
          <div className="border-brutal bg-bg-surface shadow-brutal p-8 md:p-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6 border-b border-border-primary pb-8">
              <div>
                <div className="font-mono text-xs text-text-secondary uppercase mb-2">Project</div>
                <h3 className="text-3xl font-display font-bold uppercase tracking-tight text-text-primary">my-api</h3>
              </div>
              <div className="flex gap-4">
                <span className="border border-border-primary bg-bg-secondary px-4 py-2 font-mono text-sm">Development</span>
                <span className="border border-border-primary bg-bg-secondary px-4 py-2 font-mono text-sm opacity-50">Staging</span>
                <span className="border border-border-primary bg-bg-secondary px-4 py-2 font-mono text-sm opacity-50">Production</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <h4 className="font-mono font-bold uppercase mb-6 text-sm text-text-secondary">Variables</h4>
                <div className="space-y-4">
                  {['DATABASE_URL', 'STRIPE_SECRET_KEY', 'AWS_ACCESS_KEY', 'REDIS_URL'].map((v) => (
                    <div key={v} className="flex justify-between items-center border border-border-primary p-4 bg-bg-secondary">
                      <span className="font-mono text-sm font-bold text-brand-dark">{v}</span>
                      <span className="font-mono text-xs text-text-muted tracking-[0.3em]">••••••••••••••</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 font-mono text-xs text-text-muted flex items-start gap-2 bg-brand-soft p-3 border border-brand-primary/20">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-primary mt-0.5 shrink-0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                  <span>Secret values are never rendered in the web dashboard. This reinforces the security architecture.</span>
                </div>
              </div>
              
              <div>
                <h4 className="font-mono font-bold uppercase mb-6 text-sm text-text-secondary">Team Access</h4>
                <div className="space-y-4">
                  {[
                    { name: "Aninda", role: "Owner" },
                    { name: "Rahul", role: "Developer" },
                    { name: "Maya", role: "Viewer" }
                  ].map((m, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-border-primary pb-4 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-text-primary text-bg-primary flex items-center justify-center font-mono font-bold text-xs pixel-corners">{m.name[0]}</div>
                        <span className="font-mono text-sm font-bold">{m.name}</span>
                      </div>
                      <span className="font-mono text-xs bg-bg-secondary px-2 py-1 border border-border-primary">{m.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 22. DOCUMENTATION PREVIEW */}
        <section className="border-t border-border-primary bg-bg-primary py-32">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-5xl font-display font-extrabold uppercase tracking-tight mb-6">
              Get from zero to secure<br/>in minutes.
            </h2>
            <p className="text-lg text-text-secondary mb-12">
              Comprehensive documentation for every setup.
            </p>
            
            <div className="inline-flex flex-col items-center border-brutal bg-bg-surface p-8 shadow-brutal">
              <div className="font-mono text-sm font-bold text-text-secondary uppercase mb-4 tracking-widest">Installation</div>
              <code className="text-xl md:text-2xl font-mono text-text-primary block mb-8 px-6 py-4 bg-bg-secondary border border-border-primary">
                npm install -g cloak-env
              </code>
              <Link href="/docs" className="font-mono text-sm font-bold bg-brand-primary text-white px-8 py-3 hover:bg-brand-dark transition-colors inline-block w-full text-center">
                Read Documentation
              </Link>
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
