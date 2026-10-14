'use client';

import Link from "next/link";
import { useState } from "react";
import { registerUser } from "../actions";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await registerUser(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-brand-soft selection:text-brand-dark">
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden w-full">
        {/* Pixel Art / Geometric Accents matching hero */}
        <div className="absolute top-1/4 -right-12 w-48 h-48 bg-brand-soft/40 -z-10 pixel-corners border border-brand-primary/20 pointer-events-none hidden sm:block" />
        <div className="absolute bottom-1/4 -left-12 w-48 h-48 bg-accent-yellow/20 -z-10 pixel-corners border border-accent-yellow/40 pointer-events-none hidden sm:block" />

        <div className="w-full max-w-md relative z-10">
          <div className="border-brutal bg-bg-surface shadow-brutal overflow-hidden">
            {/* Window Title Bar */}
            <div className="h-9 bg-bg-secondary border-b border-border-primary flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-border-primary" />
                <div className="w-2.5 h-2.5 rounded-full bg-border-primary" />
                <div className="w-2.5 h-2.5 rounded-full bg-border-primary" />
              </div>
              <span className="font-mono text-[11px] text-text-muted uppercase tracking-wider">
                auth // register
              </span>
            </div>

            {/* Form Body */}
            <div className="p-8 md:p-10">
              <div className="mb-6">
                <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
                  <div className="w-5 h-5 bg-brand-primary pixel-corners group-hover:bg-brand-bright transition-colors" />
                  <span className="font-display font-bold text-base tracking-tight uppercase text-text-primary">Cloak-Env</span>
                </Link>
                <div>
                  <div className="font-mono text-xs font-bold text-brand-dark bg-brand-soft uppercase tracking-widest mb-3 border border-brand-primary/20 px-2.5 py-1 inline-flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-brand-primary" />
                    NEW IDENTITY
                  </div>
                </div>
                <h1 className="text-3xl font-display font-extrabold uppercase tracking-tight text-text-primary mb-2">
                  Create Account
                </h1>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Join CLOAK-ENV to securely manage zero-trust developer secret vaults.
                </p>
              </div>

              <form action={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-mono p-3 border-l-4 border-l-red-500 flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block font-mono text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Username
                  </label>
                  <input
                    name="username"
                    type="text"
                    required
                    pattern="^[a-zA-Z0-9_.-]{2,30}$"
                    title="2 to 30 characters (letters, numbers, hyphens, and underscores)"
                    className="w-full bg-bg-primary border border-border-primary px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary font-mono text-sm transition-all"
                    placeholder="developer_username"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-mono text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Email Address
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full bg-bg-primary border border-border-primary px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary font-mono text-sm transition-all"
                    placeholder="developer@company.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-mono text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full bg-bg-primary border border-border-primary pl-4 pr-11 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary font-mono text-sm transition-all"
                      placeholder="••••••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary focus:outline-none transition-colors p-1"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-mono text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      className="w-full bg-bg-primary border border-border-primary pl-4 pr-11 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary font-mono text-sm transition-all"
                      placeholder="••••••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary focus:outline-none transition-colors p-1"
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-text-primary text-bg-primary hover:bg-brand-primary hover:text-white font-mono text-sm font-bold uppercase py-3.5 px-6 border-brutal shadow-brutal active:translate-y-0.5 active:shadow-none transition-all pixel-corners disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed mt-6"
                >
                  {loading ? "Creating account..." : "Sign Up →"}
                </button>

                <div className="pt-4 border-t border-border-primary text-center">
                  <p className="font-mono text-xs text-text-secondary">
                    Already have an account?{" "}
                    <Link
                      href="/login"
                      className="text-brand-primary hover:text-brand-dark font-bold underline-offset-4 hover:underline"
                    >
                      Log in →
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
