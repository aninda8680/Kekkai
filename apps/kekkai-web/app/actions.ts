'use server'

/**
 * Next.js server actions — the frontend API client.
 *
 * SECURITY INVARIANT (enforced by construction):
 * This file has NO method that calls /reveal or any value-bearing endpoint.
 * The frontend API client deliberately cannot call those routes — a web session
 * token would receive 403 anyway (enforced server-side), but we also remove
 * the client-side capability entirely so there is no accidental /reveal call
 * possible from any frontend code. See 02-SECURITY-ENV-STORAGE.md §4.
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const DEFAULT_LOCAL_URL = 'http://localhost:4000';
const DEFAULT_DEPLOYED_URL = 'https://cloak-env.onrender.com';

const LOCAL_API_URL = process.env.LOCAL_API_URL || 
  (process.env.API_URL?.includes('localhost') || process.env.API_URL?.includes('127.0.0.1')
    ? process.env.API_URL
    : DEFAULT_LOCAL_URL);

const DEPLOYED_API_URL = process.env.DEPLOYED_API_URL || 
  (!process.env.API_URL?.includes('localhost') && !process.env.API_URL?.includes('127.0.0.1') && process.env.API_URL
    ? process.env.API_URL
    : DEFAULT_DEPLOYED_URL);

let activeApiUrl: string | null = null;
let lastCheckTime = 0;
const HEALTH_CACHE_TTL_MS = 10_000; // 10 seconds cache

/**
 * Dynamically resolves the API base URL:
 * If localhost (e.g. http://localhost:4000) is running and healthy, it is used.
 * Otherwise, falls back to the deployed URL (e.g. https://cloak-env.onrender.com).
 */
export async function getApiUrl(): Promise<string> {
  const now = Date.now();
  if (activeApiUrl && now - lastCheckTime < HEALTH_CACHE_TTL_MS) {
    return activeApiUrl;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${LOCAL_API_URL}/health`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      activeApiUrl = LOCAL_API_URL;
      lastCheckTime = now;
      return LOCAL_API_URL;
    }
  } catch {
    // Localhost not reachable
  }

  activeApiUrl = DEPLOYED_API_URL;
  lastCheckTime = now;
  return DEPLOYED_API_URL;
}

/**
 * Centralized fetch helper that resolves base URL dynamically,
 * with automatic fallback between local and deployed if a network error occurs.
 */
async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const baseUrl = await getApiUrl();
  const endpoint = path.startsWith('http') ? path : `${baseUrl}${path}`;

  try {
    return await fetch(endpoint, options);
  } catch (err) {
    const fallbackBase = baseUrl === LOCAL_API_URL ? DEPLOYED_API_URL : LOCAL_API_URL;
    if (fallbackBase && fallbackBase !== baseUrl && !path.startsWith('http')) {
      activeApiUrl = fallbackBase;
      lastCheckTime = Date.now();
      return await fetch(`${fallbackBase}${path}`, options);
    }
    throw err;
  }
}

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('cloak-env_access_token')?.value ?? null;
}

async function apiGet(path: string) {
  const token = await getToken();
  if (!token) redirect('/login');

  const res = await apiFetch(`/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (res.status === 401) redirect('/login');
  if (!res.ok) return null;
  return res.json();
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  let res: Response;
  try {
    res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return { error: 'Could not connect to authentication server' };
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    return { error: errorData?.error || 'Invalid credentials' };
  }

  const data = await res.json();
  const cookieStore = await cookies();
  cookieStore.set('cloak-env_access_token', data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 15 * 60, // 15 min (matches JWT TTL)
  });

  redirect('/dashboard');
}

export async function registerUser(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' };
  }

  try {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Registration failed' }));
      return { error: errorData.error || 'Registration failed' };
    }
  } catch {
    return { error: 'Could not connect to authentication server' };
  }

  // Automatically log in after registration
  return login(formData);
}


export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('cloak-env_access_token');
  redirect('/login');
}

// ─── Projects ──────────────────────────────────────────────────────────────

export async function getProjects() {
  const data = await apiGet('/projects');
  return data ?? [];
}

export async function getProject(projectId: string) {
  return apiGet(`/projects/${projectId}`);
}

export async function createProject(name: string) {
  const token = await getToken();
  if (!token) redirect('/login');

  const res = await apiFetch('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    return { error: data?.error || 'Failed to create project' };
  }
  return res.json();
}

// ─── Environments ──────────────────────────────────────────────────────────

export async function getEnvironments(projectId: string) {
  return apiGet(`/projects/${projectId}/environments`);
}

// ─── Secrets — METADATA ONLY ───────────────────────────────────────────────
//
// This client has NO getSecretValue(), revealSecret(), or any method that
// calls /reveal. That endpoint is CLI-only by API design AND by this client's
// intentional omission. See 02-SECURITY-ENV-STORAGE.md §4.

export async function getSecretsMetadata(projectId: string, envId: string) {
  const [project, envs, secrets] = await Promise.all([
    apiGet(`/projects/${projectId}`),
    apiGet(`/projects/${projectId}/environments`),
    apiGet(`/projects/${projectId}/environments/${envId}/secrets`),
  ]);

  const env = envs?.find((e: Record<string, unknown>) => e.id === envId);

  return {
    secrets: secrets ?? [],
    environmentName: env?.name ?? 'unknown',
    projectName: project?.name ?? 'unknown',
  };
}

export async function getSecretHistory(projectId: string, envId: string, secretId: string) {
  return apiGet(`/projects/${projectId}/environments/${envId}/secrets/${secretId}/history`);
}

// ─── Audit ─────────────────────────────────────────────────────────────────

export async function getAuditLogs(projectId?: string, page = 1, limit = 50) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (projectId) qs.set('projectId', projectId);
  return apiGet(`/audit?${qs}`);
}

// ─── Device code approval (web only) ──────────────────────────────────────

export async function approveDeviceCode(userCode: string, password?: string) {
  const token = await getToken();
  if (!token) redirect('/login');

  const res = await apiFetch('/api/auth/device/approve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userCode, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    return { error: data?.error || 'Failed to approve device code' };
  }
  return res.json();
}

// ─── Sessions & Devices ────────────────────────────────────────────────────

export async function getSessions() {
  return apiGet('/sessions');
}

export async function revokeWebSession(sessionId: string) {
  const token = await getToken();
  if (!token) redirect('/login');

  const res = await apiFetch(`/api/sessions/web/${sessionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return { error: 'Failed to revoke session' };
  return { success: true };
}

export async function revokeCliDevice(deviceId: string) {
  const token = await getToken();
  if (!token) redirect('/login');

  const res = await apiFetch(`/api/sessions/cli/${deviceId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return { error: 'Failed to revoke device' };
  return { success: true };
}

// ─── Service Tokens ────────────────────────────────────────────────────────

export async function getServiceTokens(projectId: string) {
  return apiGet(`/projects/${projectId}/tokens`);
}

export async function createServiceToken(projectId: string, name: string, environmentId: string, ttlDays: number) {
  const token = await getToken();
  if (!token) redirect('/login');

  const res = await apiFetch(`/api/projects/${projectId}/tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, environmentId, ttlDays }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    return { error: data?.error || 'Failed to create token' };
  }
  return res.json();
}

export async function revokeServiceToken(projectId: string, tokenId: string) {
  const token = await getToken();
  if (!token) redirect('/login');

  const res = await apiFetch(`/api/projects/${projectId}/tokens/${tokenId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return { error: 'Failed to revoke token' };
  return { success: true };
}
