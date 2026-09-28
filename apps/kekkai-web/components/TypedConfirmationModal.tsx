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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md bg-neutral-900 border border-red-500/30 rounded-xl overflow-hidden shadow-2xl"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
              <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
                {description}
              </p>
              
              <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-200">
                <span className="font-semibold block mb-1">Warning</span>
                This action is destructive and cannot be reversed.
              </div>

              <form onSubmit={handleConfirm}>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Please type <span className="font-mono font-bold text-white select-all">{confirmText}</span> to confirm.
                </label>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white font-mono focus:outline-none focus:border-red-500 transition-colors mb-6"
                  placeholder={confirmText}
                  required
                />

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setInput(''); onCancel(); }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={input !== confirmText}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
