import Link from "next/link";
import React from "react";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/20 blur-[120px] pointer-events-none" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-purple-500/10 blur-[150px] pointer-events-none" />
      </div>

      <main className="relative z-10">
        {/* Navigation */}
        <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="font-bold text-lg tracking-tighter text-white">K</span>
            </div>
            <span className="font-semibold text-xl tracking-wide">KEKKAI</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-gray-300">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#security" className="hover:text-white transition-colors">Security</Link>
            <Link href="#docs" className="hover:text-white transition-colors">Documentation</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link 
              href="/dashboard" 
              className="text-sm font-medium bg-white text-black px-4 py-2 rounded-full hover:bg-gray-100 transition-all hover:scale-105 active:scale-95"
            >
              Get Started
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="px-8 pt-32 pb-20 max-w-7xl mx-auto flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-indigo-300 mb-8 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Kekkai v1.0 is now live
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 max-w-4xl bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            The Secure Vault for Modern Developers
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed">
            Protect your API keys, environment variables, and infrastructure secrets with military-grade encryption. Built for speed, designed for security.
          </p>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard" 
              className="px-8 py-4 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_-5px_rgba(79,70,229,0.5)]"
            >
              Start for free
            </Link>
            <button className="px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 text-white font-medium transition-all border border-white/10 backdrop-blur-sm">
              Read Documentation
            </button>
          </div>
        </section>

        {/* Bento Grid Features */}
        <section className="px-8 py-20 max-w-7xl mx-auto" id="features">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 md:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm hover:bg-white/[0.07] transition-colors relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] group-hover:bg-indigo-500/20 transition-colors" />
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-6 border border-indigo-500/30">
                <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold mb-3">End-to-End Encryption</h3>
              <p className="text-gray-400 leading-relaxed max-w-md">
                Your secrets are encrypted before they ever leave your machine. Zero-knowledge architecture ensures that even we can&apos;t read your data.
              </p>
            </div>

            <div className="col-span-1 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm hover:bg-white/[0.07] transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-6 border border-purple-500/30">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold mb-3">Lightning Fast</h3>
              <p className="text-gray-400 leading-relaxed">
                Global edge network ensures sub-50ms latency for secret injection in your CI/CD pipelines.
              </p>
            </div>

            <div className="col-span-1 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm hover:bg-white/[0.07] transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-6 border border-emerald-500/30">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold mb-3">RBAC Built-in</h3>
              <p className="text-gray-400 leading-relaxed">
                Granular access controls for your entire team. Revoke access instantly with a single click.
              </p>
            </div>

            <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-white/10 rounded-3xl p-8 backdrop-blur-sm relative overflow-hidden group">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-6 border border-white/20">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold mb-3">CLI First Developer Experience</h3>
              <p className="text-gray-300 leading-relaxed max-w-md">
                Inject secrets directly into your local development environment without ever touching a .env file again. 
                <code className="block mt-4 p-3 bg-black/50 rounded-lg text-sm text-indigo-300 border border-white/10 font-mono">
                  $ npx kekkai run -- npm run dev
                </code>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
