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

const API_URL = process.env.API_URL || 'http://localhost:4000';

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('cloak-env_access_token')?.value ?? null;
}

async function apiGet(path: string) {
  const token = await getToken();
  if (!token) redirect('/login');

  const res = await fetch(`${API_URL}/api${path}`, {
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

  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) return { error: 'Invalid credentials' };

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

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' };
  }

  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Registration failed' }));
    return { error: errorData.error || 'Registration failed' };
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

  const res = await fetch(`${API_URL}/api/auth/device/approve`, {
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

  const res = await fetch(`${API_URL}/api/sessions/web/${sessionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return { error: 'Failed to revoke session' };
  return { success: true };
}

export async function revokeCliDevice(deviceId: string) {
  const token = await getToken();
  if (!token) redirect('/login');

  const res = await fetch(`${API_URL}/api/sessions/cli/${deviceId}`, {
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

  const res = await fetch(`${API_URL}/api/projects/${projectId}/tokens`, {
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

  const res = await fetch(`${API_URL}/api/projects/${projectId}/tokens/${tokenId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return { error: 'Failed to revoke token' };
  return { success: true };
}
