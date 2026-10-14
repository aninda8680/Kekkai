'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface TypedConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText: string; // The exact text user must type
  actionLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TypedConfirmationModal({
  isOpen,
  title,
  description,
  confirmText,
  actionLabel = 'Confirm',
  onConfirm,
  onCancel
}: TypedConfirmationModalProps) {
  const [input, setInput] = useState('');

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === confirmText) {
      onConfirm();
      setInput('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-md border-brutal bg-bg-surface shadow-brutal pixel-corners overflow-hidden"
          >
            {/* 3-dot window bar */}
            <div className="h-8 bg-bg-secondary border-b border-border-primary flex items-center px-4 gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
              <span className="text-[11px] font-mono text-text-muted ml-2">security // destructive-action</span>
            </div>

            <div className="p-6">
              <h3 className="text-xl font-display font-extrabold uppercase text-text-primary mb-2 tracking-tight">
                {title}
              </h3>
              <p className="text-text-secondary text-xs font-sans mb-4 leading-relaxed">
                {description}
              </p>
              
              <div className="mb-5 p-3.5 pixel-corners bg-red-500/10 border border-red-500/30 text-xs font-mono text-accent-red">
                <span className="font-bold block uppercase mb-0.5">WARNING: PERMANENT ACTION</span>
                This action is irreversible and immediately invalidates active sessions or credentials.
              </div>

              <form onSubmit={handleConfirm}>
                <label className="block text-xs font-mono uppercase text-text-secondary mb-2">
                  Please type <span className="font-mono font-bold text-text-primary select-all bg-bg-secondary px-1.5 py-0.5 border border-border-primary">{confirmText}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full bg-bg-primary border border-border-primary px-3 py-2 text-text-primary font-mono text-xs focus:outline-none focus:border-accent-red pixel-corners mb-6"
                  placeholder={confirmText}
                  required
                />

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setInput(''); onCancel(); }}
                    className="px-4 py-2 text-xs font-mono uppercase text-text-secondary hover:text-text-primary border border-border-primary bg-bg-surface pixel-corners cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={input !== confirmText}
                    className="px-4 py-2 text-xs font-mono font-bold uppercase bg-accent-red text-white border-brutal shadow-brutal hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    {actionLabel}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
