'use client';

import Link from "next/link";
import { useState } from "react";
import { registerUser } from "../actions";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-black flex items-center justify-center p-4 selection:bg-indigo-500/30">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-[30%] h-[30%] rounded-full bg-indigo-500/10 blur-[100px]" />
        <div className="absolute bottom-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-purple-500/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="font-bold text-xl text-white">K</span>
            </div>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Create an Account</h1>
          <p className="text-gray-400">Join CLOAK-ENV and secure your workflow.</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
          <form action={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Email Address</label>
              <input 
                name="email"
                type="email" 
                required
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                placeholder="developer@company.com"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Password</label>
              <input 
                name="password"
                type="password" 
                required
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                placeholder="••••••••••••••••"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Confirm Password</label>
              <input 
                name="confirmPassword"
                type="password" 
                required
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                placeholder="••••••••••••••••"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-all active:scale-[0.98] mt-4 disabled:opacity-70"
            >
              {loading ? "Creating account..." : "Sign up"}
            </button>

            <p className="text-center text-sm text-gray-400 mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                Log in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
