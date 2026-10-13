"use client";

import React from "react";
import { motion } from "framer-motion";

export function ArchitectureFlow() {
  return (
    <div className="w-full bg-bg-surface border-brutal p-8 md:p-16 relative overflow-hidden">
      {/* Background Pixel Art accents */}
      <div className="absolute top-0 right-0 p-4 opacity-20">
        <div className="grid grid-cols-4 gap-1">
          {[...Array(16)].map((_, i) => (
            <div key={i} className={`w-2 h-2 ${i % 3 === 0 || i % 7 === 0 ? 'bg-brand-primary' : 'bg-transparent'}`} />
          ))}
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4 relative z-10">
        
        {/* Node 1: Developer/CLI */}
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 border-2 border-text-primary bg-bg-elevated flex items-center justify-center pixel-corners shadow-brutal z-10 relative">
            <svg className="w-8 h-8 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="mt-4 font-mono text-sm font-bold">Local Machine</div>
          <div className="text-xs text-text-secondary font-mono mt-1">.env (encrypted)</div>
        </div>

        {/* Animated Arrow 1 */}
        <div className="flex-1 flex items-center justify-center relative w-full h-12 md:h-auto">
          <div className="absolute w-1 h-full md:w-full md:h-1 bg-border-primary" />
          <motion.div 
            animate={{ x: [0, 100, 100, 0], opacity: [0, 1, 0, 0] }}
            transition={{ repeat: Infinity, duration: 3, times: [0, 0.4, 0.5, 1] }}
            className="absolute w-3 h-3 bg-brand-primary hidden md:block"
            style={{ left: "20%" }}
          />
          <motion.div 
            animate={{ y: [0, 100, 100, 0], opacity: [0, 1, 0, 0] }}
            transition={{ repeat: Infinity, duration: 3, times: [0, 0.4, 0.5, 1] }}
            className="absolute w-3 h-3 bg-brand-primary block md:hidden"
            style={{ top: "10%" }}
          />
        </div>

        {/* Node 2: Cloak Vault */}
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 border-2 border-brand-primary bg-brand-soft flex flex-col items-center justify-center shadow-[4px_4px_0_0_var(--brand-dark)] z-10 relative">
            <svg className="w-10 h-10 text-brand-dark mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div className="font-mono text-xs font-bold text-brand-dark">CLOAK-ENV</div>
            <div className="font-mono text-[10px] text-brand-dark opacity-80">VAULT</div>
          </div>
          <div className="mt-4 font-mono text-sm font-bold">Cloud Storage</div>
          <div className="text-xs text-brand-primary font-mono mt-1">AES-256-GCM</div>
        </div>

        {/* Animated Arrow 2 */}
        <div className="flex-1 flex items-center justify-center relative w-full h-12 md:h-auto">
          <div className="absolute w-1 h-full md:w-full md:h-1 bg-border-primary" />
          <motion.div 
            animate={{ x: [0, 100, 100, 0], opacity: [0, 1, 0, 0] }}
            transition={{ repeat: Infinity, duration: 3, times: [0, 0.4, 0.5, 1], delay: 1.5 }}
            className="absolute w-3 h-3 bg-brand-primary hidden md:block"
            style={{ left: "20%" }}
          />
          <motion.div 
            animate={{ y: [0, 100, 100, 0], opacity: [0, 1, 0, 0] }}
            transition={{ repeat: Infinity, duration: 3, times: [0, 0.4, 0.5, 1], delay: 1.5 }}
            className="absolute w-3 h-3 bg-brand-primary block md:hidden"
            style={{ top: "10%" }}
          />
        </div>

        {/* Node 3: Runtime */}
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 border-2 border-text-primary bg-bg-elevated flex items-center justify-center pixel-corners shadow-brutal z-10 relative">
            <svg className="w-8 h-8 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
          </div>
          <div className="mt-4 font-mono text-sm font-bold">Runtime</div>
          <div className="text-xs text-text-secondary font-mono mt-1">In-memory injection</div>
        </div>
      </div>
      
      {/* Dashboard Context Callout */}
      <div className="mt-16 pt-8 border-t border-border-primary text-center">
        <p className="text-sm font-mono text-text-secondary max-w-xl mx-auto uppercase tracking-widest">
          The Web Dashboard manages access & metadata.<br/>
          <span className="text-brand-primary font-bold">It never displays plaintext secrets.</span>
        </p>
      </div>
    </div>
  );
}
