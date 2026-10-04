'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { approveDeviceCode } from '@/app/actions';

function DeviceLoginForm() {
  const searchParams = useSearchParams();
  const prefilled = searchParams.get('code') || '';

  const [userCode, setUserCode] = useState(prefilled);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [approvedAccount, setApprovedAccount] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userCode.trim()) return;

    setLoading(true);
    setError('');

    const res = await approveDeviceCode(userCode.trim().toUpperCase(), password);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setApprovedAccount(res.deviceInfo?.account || '');
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    }
  };

  const formatCode = (value: string) => {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length > 4) return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
    return clean;
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-cyan-400 rounded-md flex items-center justify-center">
              <span className="text-black font-bold text-sm">K</span>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">CLOAK-ENV</span>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Connect CLOAK-ENV CLI</h1>
          <p className="text-neutral-400 text-sm mt-2">
            Enter the code shown in your terminal to securely connect your device.
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl relative overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-60" />

          <div className="p-8">
            {success ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
                  <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Authentication Successful</h2>
                {approvedAccount && (
                  <p className="text-neutral-400 text-sm mb-1">
                    Logged in as <span className="text-cyan-400 font-medium">{approvedAccount}</span>
                  </p>
                )}
                <p className="text-neutral-500 text-sm mt-3">
                  You can now close this window and return to your terminal.
                </p>
                <p className="text-neutral-600 text-xs mt-4">Redirecting to dashboard...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Device Code Input */}
                <div>
                  <label htmlFor="userCode" className="block text-sm font-medium text-neutral-300 mb-2">
                    One-time code
                  </label>
                  <input
                    id="userCode"
                    type="text"
                    placeholder="XXXX-XXXX"
                    value={userCode}
                    onChange={(e) => setUserCode(formatCode(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 font-mono text-center tracking-[0.3em] text-lg uppercase transition-all placeholder:text-neutral-600"
                    autoComplete="off"
                    maxLength={9}
                    required
                  />
                  <p className="text-xs text-neutral-600 mt-1.5 text-center">
                    Copy this from your terminal where you ran{' '}
                    <code className="font-mono text-neutral-500">cloak-env auth login</code>
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t border-neutral-800" />

                {/* Step-up Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-neutral-300 mb-2">
                    Confirm your password{' '}
                    <span className="text-neutral-500 font-normal">(step-up security)</span>
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="Enter your CLOAK-ENV password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all placeholder:text-neutral-600"
                    required
                  />
                  <p className="text-xs text-neutral-600 mt-1.5">
                    Re-entering your password ensures only you can authorize this session.
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                    <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || userCode.length < 9 || !password}
                  className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-neutral-100 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Authorizing...
                    </>
                  ) : (
                    'Authorize CLI'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Security note */}
        <p className="text-center text-xs text-neutral-600 mt-5">
          Never share your one-time code. CLOAK-ENV will never ask for your token in an email.
        </p>
      </div>
    </div>
  );
}

export default function LoginDevicePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center p-4">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DeviceLoginForm />
    </Suspense>
  );
}
