#!/usr/bin/env node

/**
 * KEKKAI CLI — complete implementation
 *
 * Security design:
 *  - Login uses device-code flow — the CLI process NEVER handles a raw password
 *  - Config stored at ~/.kekkai/config.json (chmod 0600)
 *  - All destructive operations require confirmation unless --yes
 *  - .gitignore checked before writing .env
 *  - Every secret access is audit-logged server-side
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { execSync, spawn } from 'node:child_process';

// ─── Configuration ─────────────────────────────────────────────────────────

let globalConfigCache: GlobalConfig | null = null;
const CONFIG_DIR = path.join(os.homedir(), '.kekkai');
const GLOBAL_CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
const LOCAL_CONFIG_FILE = '.kekkai/config.json';

/**
 * Single source of truth for the KEKKAI host.
 * Priority order:
 *  1. KEKKAI_HOST env var (overrides everything)
 *  2. KEKKAI_API_URL env var (legacy, deprecated)
 *  3. config.host (saved after kekkai auth login)
 *  4. config.apiUrl (legacy, migrated on first read)
 *  5. Default production host
 */
const DEFAULT_HOST = 'https://kekkai.onrender.com';

function getHost(): string {
  if (process.env.KEKKAI_HOST) return process.env.KEKKAI_HOST.trim();
  if (process.env.KEKKAI_API_URL) return process.env.KEKKAI_API_URL.trim();  // legacy compat
  const config = loadGlobalConfig();
  if (config.host) return config.host.trim();
  if (config.apiUrl) return config.apiUrl.trim();  // migrate legacy apiUrl transparently
  return DEFAULT_HOST;
}

/** The URL the CLI calls for API requests. */
function getApiUrl(): string {
  return getHost();
}

interface GlobalConfig {
  host?: string;           // canonical KEKKAI host (replaces apiUrl)
  apiUrl?: string;         // DEPRECATED — kept for backward compat, migrated on read
  user?: {
    id: string;
    email: string;
  };
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;      // ms timestamp for auth status without network call
  email?: string;          // DEPRECATED — kept for backward compat (use user.email)
}

interface LocalConfig {
  projectId: string;
  projectName: string;
  environmentId: string;
  environmentName: string;
}

// ─── Config Helpers ────────────────────────────────────────────────────────

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  try { fs.chmodSync(CONFIG_DIR, 0o700); } catch { /* not all OSes support this */ }
}

function loadGlobalConfig(): GlobalConfig {
  if (globalConfigCache) return globalConfigCache;
  ensureConfigDir();
  if (!fs.existsSync(GLOBAL_CONFIG_PATH)) return {};
  try {
    const c = JSON.parse(fs.readFileSync(GLOBAL_CONFIG_PATH, 'utf8'));
    globalConfigCache = c;
    return c;
  } catch { return {}; }
}

function saveGlobalConfig(config: GlobalConfig): void {
  ensureConfigDir();
  fs.writeFileSync(GLOBAL_CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
  globalConfigCache = config;
}

function loadLocalConfig(): LocalConfig | null {
  if (!fs.existsSync(LOCAL_CONFIG_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(LOCAL_CONFIG_FILE, 'utf8')); } catch { return null; }
}

function saveLocalConfig(config: LocalConfig): void {
  const dir = path.dirname(LOCAL_CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LOCAL_CONFIG_FILE, JSON.stringify(config, null, 2));
}

function requireToken(): string {
  if (process.env.KEKKAI_TOKEN) return process.env.KEKKAI_TOKEN;
  const config = loadGlobalConfig();
  if (!config.accessToken) {
    console.error(chalk.red('✗ Not logged in. Run: kekkai auth login'));
    process.exit(1);
  }
  return config.accessToken;
}

function requireLocalConfig(): LocalConfig {
  const config = loadLocalConfig();
  if (!config) {
    console.error(chalk.red('✗ No project linked. Run: kekkai init'));
    process.exit(1);
  }
  return config;
}

function getOptionalLocalConfig(): LocalConfig | null {
  const config = loadLocalConfig();
  if (!config) {
    if (process.env.KEKKAI_TOKEN) return null; // allow fallback for service tokens
    console.error(chalk.red('✗ No project linked. Run: kekkai init'));
    process.exit(1);
  }
  return config;
}

// ─── API Helpers ───────────────────────────────────────────────────────────

async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options.headers as Record<string, string>),
  };
  let res = await fetch(`${getApiUrl()}${endpoint}`, { ...options, headers });

  // Auto-refresh on 401 (once), unless using a static service token override
  if (res.status === 401 && token && !process.env.KEKKAI_TOKEN) {
    const config = loadGlobalConfig();
    if (config.refreshToken) {
      // Use the new /oauth/token/refresh endpoint; fall back to legacy /api/auth/refresh
      const refreshRes = await fetch(`${getApiUrl()}/oauth/token/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: config.refreshToken }),
      }).catch(() => null);

      const refreshData = refreshRes?.ok ? await refreshRes.json().catch(() => null) : null;

      if (refreshData?.accessToken) {
        config.accessToken = refreshData.accessToken;
        if (refreshData.refreshToken) config.refreshToken = refreshData.refreshToken;
        if (refreshData.expiresIn) config.expiresAt = Date.now() + refreshData.expiresIn * 1000;
        saveGlobalConfig(config);
        // Retry original request with new token
        headers['Authorization'] = `Bearer ${refreshData.accessToken}`;
        res = await fetch(`${getApiUrl()}${endpoint}`, { ...options, headers });
      } else {
        // Refresh failed — clear stale credentials to force re-login
        config.accessToken = undefined;
        config.refreshToken = undefined;
        config.expiresAt = undefined;
        saveGlobalConfig(config);
      }
    }
  }

  return res;
}

// ─── Gitignore Check ───────────────────────────────────────────────────────

function isInGitignore(pattern: string): boolean {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (!fs.existsSync(gitignorePath)) return false;
  const content = fs.readFileSync(gitignorePath, 'utf8');
  return content.split('\n').some((line) => line.trim() === pattern || line.trim() === `/${pattern}`);
}

function warnGitignore(file: string): void {
  if (!isInGitignore(file)) {
    console.warn(chalk.yellow(`⚠ Warning: '${file}' is not in .gitignore — run: echo '${file}' >> .gitignore`));
  }
}

// ─── Env File Helpers ──────────────────────────────────────────────────────

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    result[key] = value;
  }
  return result;
}

function writeEnvFile(filePath: string, secrets: Record<string, string>): void {
  const lines = Object.entries(secrets).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(filePath, lines.join('\n') + '\n', { mode: 0o600 });
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => { rl.close(); resolve(answer); });
  });
}

async function confirm(message: string, defaultNo = true): Promise<boolean> {
  const suffix = defaultNo ? chalk.gray(' [y/N] ') : chalk.gray(' [Y/n] ');
  const answer = await prompt(message + suffix);
  const lower = answer.trim().toLowerCase();
  if (defaultNo) return lower === 'y' || lower === 'yes';
  return lower !== 'n' && lower !== 'no';
}

// ─── Program ───────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('kekkai')
  .description(chalk.bold('KEKKAI') + ' — Secure developer secret vault')
  .version('1.0.0');

// ─── AUTH COMMAND GROUP ────────────────────────────────────────────────────

const authCmd = program.command('auth').description('Manage authentication');

// ─── auth login ────────────────────────────────────────────────────────────

async function runAuthLogin(opts: {
  noBrowser?: boolean;
  local?: boolean;
  api?: string;
  host?: string;
}) {
  // ── Resolve the host for this session ──
  let sessionHost: string | undefined;
  if (opts.host)  sessionHost = opts.host;
  if (opts.api)   sessionHost = opts.api;   // --api is a legacy alias for --host
  if (opts.local) sessionHost = 'http://localhost:4000';

  if (sessionHost) {
    process.env.KEKKAI_HOST = sessionHost;
  }

  const apiUrl = getApiUrl();

  // ── Step 1: Initiate device-code flow ──
  const spinner = ora({ text: `Connecting to ${chalk.cyan(apiUrl)}...`, color: 'cyan' }).start();

  let initData: {
    device_code: string; user_code: string; verification_uri: string;
    expires_in: number; interval: number;
    deviceCode?: string; userCode?: string; expiresIn?: number;
    verificationUrl?: string;
  };

  try {
    const res = await fetch(`${apiUrl}/oauth/device/code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      spinner.fail('Failed to start authentication flow');
      process.exit(1);
    }
    initData = await res.json();
  } catch {
    spinner.fail('Cannot reach KEKKAI server. Check your connection or run with --local.');
    process.exit(1);
  }

  spinner.stop();

  // Normalize between new and legacy response shapes
  const deviceCode     = initData.device_code  || initData.deviceCode!;
  const userCode       = initData.user_code     || initData.userCode!;
  const expiresIn      = initData.expires_in    || initData.expiresIn!;
  const serverInterval = initData.interval || 5;
  // The server knows the correct frontend URL — always use it for the browser
  const browserUrl     = initData.verification_uri || initData.verificationUrl
    || (opts.local ? 'http://localhost:3000/login/device' : 'https://kekkai-env.vercel.app/login/device');

  // ── Step 2: Display GitHub-style prompt ──
  console.log('');
  console.log(chalk.bold('KEKKAI Authentication'));
  console.log('');
  console.log('First, copy your one-time code:');
  console.log('');
  console.log('  ' + chalk.bgCyan.black.bold(` ${userCode} `));
  console.log('');

  if (opts.noBrowser) {
    console.log('Open this URL in your browser:');
    console.log('');
    console.log('  ' + chalk.cyan(browserUrl));
    console.log('');
    console.log('Enter the code above when prompted.');
  } else {
    console.log('Opening:');
    console.log('  ' + chalk.cyan(browserUrl));
    console.log('');
    try {
      if (process.platform === 'win32') execSync(`start "" "${browserUrl}"`, { stdio: 'ignore' });
      else if (process.platform === 'darwin') execSync(`open "${browserUrl}"`, { stdio: 'ignore' });
      else execSync(`xdg-open "${browserUrl}"`, { stdio: 'ignore' });
    } catch {
      console.log(chalk.gray('  (Could not open browser automatically — please open the URL above manually)'));
    }
  }

  // ── Step 3: Poll for authorization ──
  const pollSpinner = ora({ text: 'Waiting for authentication...', color: 'cyan' }).start();
  let pollInterval = serverInterval * 1000;
  const deadline = Date.now() + expiresIn * 1000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollInterval));

    let pollRes: Response;
    try {
      pollRes = await fetch(`${apiUrl}/oauth/device/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_code: deviceCode }),
      });
    } catch {
      continue; // Network blip — keep trying until deadline
    }

    if (pollRes.status === 202) continue; // pending

    let pollData: Record<string, unknown>;
    try { pollData = await pollRes.json(); } catch { continue; }

    // slow_down: server wants us to back off
    if (pollData.status === 'slow_down' && typeof pollData.interval === 'number') {
      pollInterval = (pollData.interval as number) * 1000;
      continue;
    }

    if (pollData.status === 'expired') {
      pollSpinner.fail('Authentication request expired.');
      console.log('');
      console.log(chalk.gray(`Run ${chalk.bold('kekkai auth login')} to try again.`));
      process.exit(1);
    }

    if (pollRes.ok && pollData.status === 'authorized') {
      const accessToken  = (pollData.access_token  || pollData.accessToken)  as string;
      const refreshToken = (pollData.refresh_token || pollData.refreshToken) as string;
      const tokenExpiresIn = (pollData.expires_in || 900) as number;

      // ── Step 4: Fetch user info ──
      pollSpinner.text = 'Fetching account info...';
      let userEmail = '';
      let userId = '';
      try {
        const meRes = await fetch(`${apiUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (meRes.ok) {
          const me = await meRes.json();
          userEmail = me.email || '';
          userId    = me.id    || '';
        }
      } catch { /* non-fatal */ }

      // ── Step 5: Save credentials ──
      const config = loadGlobalConfig();
      config.host         = sessionHost || config.host || DEFAULT_HOST;
      config.accessToken  = accessToken;
      config.refreshToken = refreshToken;
      config.expiresAt    = Date.now() + tokenExpiresIn * 1000;
      if (userEmail) config.user = { id: userId, email: userEmail };
      if (userEmail) config.email = userEmail;  // legacy compat
      if (config.apiUrl && config.host) delete config.apiUrl;  // migrate legacy field
      saveGlobalConfig(config);

      pollSpinner.succeed(chalk.green('✓ Authentication successful.'));
      console.log('');
      if (userEmail) console.log(`Logged in as ${chalk.bold(userEmail)}`);
      return;
    }

    if (!pollRes.ok) {
      pollSpinner.fail('Authentication failed.');
      const errMsg = typeof pollData.error === 'string' ? pollData.error : '';
      if (errMsg) console.error(chalk.red(`  ${errMsg}`));
      process.exit(1);
    }
  }

  pollSpinner.fail('Authentication request expired.');
  console.log(chalk.gray(`Run ${chalk.bold('kekkai auth login')} to try again.`));
  process.exit(1);
}

authCmd
  .command('login')
  .description('Authenticate with KEKKAI (device-code flow — no password in CLI)')
  .option('--no-browser', 'Print the URL instead of opening a browser')
  .option('--local',      'Use local development server (http://localhost:4000)')
  .option('--api <url>',  'Use a custom API URL (deprecated: use --host)')
  .option('--host <url>', 'Use a custom KEKKAI host URL')
  .action(async (opts) => runAuthLogin(opts));

// ─── auth status ───────────────────────────────────────────────────────────

authCmd
  .command('status')
  .description('Show current authentication state')
  .action(async () => {
    const config = loadGlobalConfig();

    console.log('');
    console.log(chalk.bold('KEKKAI Authentication'));
    console.log('');

    if (!config.accessToken) {
      console.log(chalk.yellow('Not authenticated.'));
      console.log('');
      console.log('Run:');
      console.log('');
      console.log(`  ${chalk.bold('kekkai auth login')}`);
      console.log('');
      return;
    }

    const host    = config.host || config.apiUrl || DEFAULT_HOST;
    const account = config.user?.email || config.email || chalk.gray('(unknown)');

    let statusLine: string;
    let expiresLine = '';

    if (config.expiresAt) {
      const minsLeft = Math.round((config.expiresAt - Date.now()) / 60_000);
      if (minsLeft > 0) {
        statusLine  = chalk.green('Authenticated');
        expiresLine = minsLeft === 1 ? 'in 1 minute'
          : minsLeft < 60 ? `in ${minsLeft} minutes`
          : `in ${Math.round(minsLeft / 60)} hours`;
      } else {
        statusLine  = chalk.yellow('Token expired (will auto-refresh on next command)');
        expiresLine = 'expired';
      }
    } else {
      statusLine = chalk.green('Authenticated');
    }

    const label = (s: string) => chalk.bold(s.padEnd(10));
    console.log(`${label('Host')}   ${chalk.cyan(host)}`);
    console.log(`${label('Account')}${account}`);
    console.log(`${label('Status')} ${statusLine}`);
    if (expiresLine) console.log(`${label('Expires')}${expiresLine}`);
    console.log('');
  });

// ─── auth logout ───────────────────────────────────────────────────────────

async function runAuthLogout() {
  const config = loadGlobalConfig();
  const token  = config.accessToken || process.env.KEKKAI_TOKEN;

  // 1. Attempt server-side revocation (gracefully ignore network errors)
  if (token && config.refreshToken) {
    try {
      await fetch(`${getApiUrl()}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: config.refreshToken }),
      });
    } catch { /* ignore — still clear locally */ }
  }

  // 2. Clear all local credentials and user data
  // Do NOT preserve the host — a stale --local host would break the next login
  saveGlobalConfig({});

  console.log(chalk.green('✓ Logged out successfully.'));
}

authCmd
  .command('logout')
  .description('Revoke CLI session locally and on the server')
  .action(async () => runAuthLogout());

// ─── auth devices ──────────────────────────────────────────────────────────

authCmd
  .command('devices')
  .description('List registered CLI devices for your account')
  .action(async () => {
    const token = requireToken();
    const res   = await apiFetch('/api/sessions', {}, token);
    if (!res.ok) { console.error(chalk.red('✗ Failed to fetch devices')); process.exit(1); }

    const data = await res.json();
    const cliDevices: any[] = data.cliDevices || [];

    console.log('');
    console.log(chalk.bold('KEKKAI CLI Devices'));
    console.log('');

    if (cliDevices.length === 0) {
      console.log(chalk.gray('No CLI devices registered.'));
      console.log('');
      return;
    }

    cliDevices.forEach((d: any, i: number) => {
      const lastUsed = d.lastUsedAt ? new Date(d.lastUsedAt).toLocaleString() : 'Never';
      const revokedLabel = d.revoked ? chalk.red(' [revoked]') : '';
      console.log(`${chalk.cyan(i + 1)}. ${chalk.bold(d.name || 'Unknown device')}${revokedLabel}`);
      console.log(`   Last used: ${chalk.gray(lastUsed)}`);
      if (d.lastIp) console.log(`   IP: ${chalk.gray(d.lastIp)}`);
      console.log(`   ID: ${chalk.gray(d.id)}`);
      console.log('');
    });

    console.log(chalk.gray('To revoke a device: kekkai auth revoke <device-id>'));
    console.log('');
  });

// auth revoke
authCmd
  .command('revoke <deviceId>')
  .description('Revoke a specific CLI device by ID')
  .action(async (deviceId: string) => {
    const token = requireToken();
    const res   = await apiFetch(`/api/sessions/cli/${deviceId}`, { method: 'DELETE' }, token);
    if (!res.ok) { console.error(chalk.red('✗ Failed to revoke device')); process.exit(1); }
    console.log(chalk.green(`✓ Device ${deviceId} revoked.`));
  });

// ─── BACKWARD-COMPAT ALIASES (deprecated) ─────────────────────────────────

program
  .command('login', { hidden: true })
  .description('[Deprecated] Use: kekkai auth login')
  .option('--local',       'Use local development server')
  .option('--api <url>',   'Use a custom API URL')
  .option('--host <url>',  'Use a custom KEKKAI host URL')
  .option('--no-browser',  'Print the URL instead of opening a browser')
  .action(async (opts) => {
    process.stderr.write(chalk.yellow('\n⚠  kekkai login is deprecated. Use: kekkai auth login\n\n'));
    await runAuthLogin(opts);
  });

program
  .command('logout', { hidden: true })
  .description('[Deprecated] Use: kekkai auth logout')
  .action(async () => {
    process.stderr.write(chalk.yellow('\n⚠  kekkai logout is deprecated. Use: kekkai auth logout\n\n'));
    await runAuthLogout();
  });

program
  .command('whoami', { hidden: true })
  .description('[Deprecated] Use: kekkai auth status')
  .action(async () => {
    process.stderr.write(chalk.yellow('\n⚠  kekkai whoami is deprecated. Use: kekkai auth status\n\n'));
    const config = loadGlobalConfig();
    if (!config.accessToken) {
      console.error(chalk.red('✗ Not authenticated. Run: kekkai auth login'));
      process.exit(1);
    }
    const token = requireToken();
    const res = await apiFetch('/api/auth/me', {}, token);
    if (!res.ok) { console.error(chalk.red('✗ Session invalid. Run: kekkai auth login')); process.exit(1); }
    const { email, id } = await res.json();
    console.log(chalk.bold('User:   ') + email);
    console.log(chalk.bold('ID:     ') + id);
    console.log(chalk.bold('Config: ') + GLOBAL_CONFIG_PATH);
  });



// ─── INIT ─────────────────────────────────────────────────────────────────

program
  .command('init')
  .description('Link this directory to a KEKKAI project and environment')
  .option('--force', 'Relink even if already configured')
  .action(async (opts) => {
    const existing = loadLocalConfig();
    if (existing && !opts.force) {
      console.log(chalk.yellow(`Already linked to project '${existing.projectName}' (${existing.environmentName}).`));
      console.log(chalk.gray('Use --force to relink.'));
      return;
    }

    const token = requireToken();

    // Fetch projects
    const res = await apiFetch('/api/projects', {}, token);
    if (!res.ok) { console.error(chalk.red('Failed to fetch projects')); process.exit(1); }
    const projects = await res.json();

    if (projects.length === 0) {
      console.log(chalk.yellow('No projects yet. Create one with: kekkai project create'));
      return;
    }

    console.log(chalk.bold('\nAvailable projects:\n'));
    projects.forEach((p: any, i: number) => console.log(`  ${chalk.cyan(i + 1)}) ${p.name} ${chalk.gray('(' + p.slug + ')')}`));

    const projIdxStr = await prompt('\nSelect project number: ');
    const projIdx = parseInt(projIdxStr) - 1;
    if (projIdx < 0 || projIdx >= projects.length) { console.error(chalk.red('Invalid selection')); process.exit(1); }
    const project = projects[projIdx];

    // Fetch environments
    const envRes = await apiFetch(`/api/projects/${project.id}/environments`, {}, token);
    const envs = await envRes.json();

    console.log(chalk.bold('\nAvailable environments:\n'));
    envs.forEach((e: any, i: number) => console.log(`  ${chalk.cyan(i + 1)}) ${e.name} ${chalk.gray('(' + e.secretCount + ' secrets)')}`));

    const envIdxStr = await prompt('\nSelect environment number: ');
    const envIdx = parseInt(envIdxStr) - 1;
    if (envIdx < 0 || envIdx >= envs.length) { console.error(chalk.red('Invalid selection')); process.exit(1); }
    const env = envs[envIdx];

    saveLocalConfig({ projectId: project.id, projectName: project.name, environmentId: env.id, environmentName: env.name });

    // Gitignore checks
    warnGitignore('.env');
    warnGitignore('.kekkai');

    console.log(chalk.green(`\n✓ Linked to ${chalk.bold(project.name)} / ${chalk.bold(env.name)}`));
    console.log(chalk.gray('  Config saved to .kekkai/config.json'));
  });

// ─── PUSH ─────────────────────────────────────────────────────────────────

program
  .command('push')
  .description('Upload local .env to KEKKAI vault (with diff preview)')
  .option('--env <file>', '.env file to push', '.env')
  .option('--yes', 'Skip confirmation prompt')
  .action(async (opts) => {
    const token = requireToken();
    const local = requireLocalConfig();

    warnGitignore('.env');
    warnGitignore('.kekkai');

    if (!fs.existsSync(opts.env)) {
      console.error(chalk.red(`✗ File not found: ${opts.env}`));
      process.exit(1);
    }

    const localSecrets = parseEnvFile(opts.env);
    if (Object.keys(localSecrets).length === 0) {
      console.log(chalk.yellow('No secrets found in .env file.'));
      return;
    }

    // Fetch server-side diff
    const spinner = ora('Computing diff...').start();
    const res = await apiFetch('/api/sync/push', {
      method: 'POST',
      body: JSON.stringify({
        environmentId: local.environmentId,
        secrets: Object.entries(localSecrets).map(([key, value]) => ({ key, value })),
      }),
    }, token);
    spinner.stop();

    if (!res.ok) {
      const err = await res.json();
      console.error(chalk.red(`✗ ${err.error || 'Push failed'}`));
      process.exit(1);
    }

    const { diff } = await res.json();

    // Display diff
    console.log(chalk.bold(`\nComparing local .env against vault (${local.environmentName})...\n`));
    for (const { key, status } of diff) {
      if (status === 'added') console.log(`  ${chalk.green('+')} ${chalk.green(key.padEnd(30))} ${chalk.gray('(new)')}`);
      else if (status === 'changed') console.log(`  ${chalk.yellow('~')} ${chalk.yellow(key.padEnd(30))} ${chalk.gray('(changed)')}`);
      else console.log(`  ${chalk.gray('=')} ${chalk.gray(key.padEnd(30))} ${chalk.gray('(unchanged, skipped)')}`);
    }

    const toUpload = diff.filter((d: any) => d.status !== 'unchanged');
    if (toUpload.length === 0) {
      console.log(chalk.gray('\nNo changes to push. Vault is up to date.'));
      return;
    }

    console.log('');
    const proceed = opts.yes || await confirm(`Push ${toUpload.length} change(s) to ${chalk.bold(local.environmentName)}?`);
    if (!proceed) { console.log(chalk.gray('Push cancelled.')); return; }

    // Re-push only changed/new secrets
    const changed = Object.fromEntries(
      toUpload.map((d: any) => [d.key, localSecrets[d.key]])
    );

    const pushRes = await apiFetch('/api/sync/push', {
      method: 'POST',
      body: JSON.stringify({
        environmentId: local.environmentId,
        secrets: Object.entries(changed).map(([key, value]) => ({ key, value })),
      }),
    }, token);

    if (!pushRes.ok) {
      console.error(chalk.red('✗ Push failed'));
      process.exit(1);
    }

    console.log('');
    for (const key of Object.keys(changed)) {
      console.log(`  ${chalk.green('✓')} ${key}`);
    }
    console.log(chalk.green(`\n${toUpload.length} secret(s) synchronized.`));
    if (diff.filter((d: any) => d.status === 'unchanged').length > 0) {
      console.log(chalk.gray(`(${diff.filter((d: any) => d.status === 'unchanged').length} unchanged secret(s) skipped)`));
    }
  });

// ─── PULL ─────────────────────────────────────────────────────────────────

program
  .command('pull')
  .description('Pull vault secrets into local .env (with diff preview)')
  .option('--env <file>', 'Target .env file', '.env')
  .option('--dry-run', 'Show diff without writing')
  .option('--yes', 'Skip confirmation')
  .action(async (opts) => {
    const token = requireToken();
    const local = getOptionalLocalConfig();
    warnGitignore('.env');

    const spinner = ora('Fetching secrets...').start();
    const body = local ? JSON.stringify({ environmentId: local.environmentId }) : '{}';
    const res = await apiFetch('/api/sync/pull', {
      method: 'POST',
      body,
    }, token);
    spinner.stop();

    if (!res.ok) {
      console.error(chalk.red('✗ Pull failed: ' + (await res.json()).error || 'Unknown error'));
      process.exit(1);
    }

    const { secrets: remote } = await res.json();
    const current = parseEnvFile(opts.env);

    // Compute diff
    const allKeys = new Set([...Object.keys(remote), ...Object.keys(current)]);
    const diff: { key: string; status: string }[] = [];
    for (const key of allKeys) {
      if (!(key in current)) diff.push({ key, status: 'added' });
      else if (!(key in remote)) diff.push({ key, status: 'removed' });
      else if (current[key] !== remote[key]) diff.push({ key, status: 'changed' });
      else diff.push({ key, status: 'unchanged' });
    }

    const changes = diff.filter((d) => d.status !== 'unchanged');

    const envName = local ? local.environmentName : 'Service Token Environment';
    console.log(chalk.bold(`\nVault (${envName}) vs local ${opts.env}:\n`));
    for (const { key, status } of diff) {
      if (status === 'added') console.log(`  ${chalk.green('+')} ${chalk.green(key.padEnd(30))} ${chalk.gray('(new from vault)')}`);
      else if (status === 'changed') console.log(`  ${chalk.yellow('~')} ${chalk.yellow(key.padEnd(30))} ${chalk.gray('(differs)')}`);
      else if (status === 'removed') console.log(`  ${chalk.red('-')} ${chalk.red(key.padEnd(30))} ${chalk.gray('(not in vault)')}`);
      else console.log(`  ${chalk.gray('=')} ${chalk.gray(key.padEnd(30))} ${chalk.gray('(unchanged)')}`);
    }

    if (opts.dryRun) { console.log(chalk.gray('\n[dry-run] No files written.')); return; }
    if (changes.length === 0) { console.log(chalk.gray('\nAlready up to date.')); return; }

    console.log('');
    const proceed = opts.yes || await confirm(`Write ${Object.keys(remote).length} secrets to ${opts.env}?`);
    if (!proceed) { console.log(chalk.gray('Pull cancelled.')); return; }

    writeEnvFile(opts.env, remote);
    console.log(chalk.green(`\n✓ ${opts.env} written (${Object.keys(remote).length} secrets, permissions 0600)`));
  });

// ─── RUN ──────────────────────────────────────────────────────────────────

program
  .command('run')
  .description('Run a command with secrets injected (never written to disk)')
  .option('--env-name <name>', 'Environment name (overrides linked environment)')
  .allowExcessArguments(true)
  .argument('<command...>', 'Command to run')
  .action(async (commandArgs, opts) => {
    const token = requireToken();
    const local = getOptionalLocalConfig();

    const spinner = ora('Fetching secrets...').start();
    const body = local ? JSON.stringify({ environmentId: local.environmentId }) : '{}';
    const res = await apiFetch('/api/sync/pull', {
      method: 'POST',
      body,
    }, token);
    spinner.stop();

    if (!res.ok) { console.error(chalk.red('✗ Failed to fetch secrets')); process.exit(1); }

    const { secrets } = await res.json();

    const [cmd, ...args] = commandArgs;
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      env: { ...process.env, ...secrets },  // inject only into child env — never disk
    });

    child.on('exit', (code) => process.exit(code ?? 0));
    child.on('error', (err) => { console.error(chalk.red(`✗ Command failed: ${err.message}`)); process.exit(1); });
  });

// ─── STATUS ───────────────────────────────────────────────────────────────

program
  .command('status')
  .description('Show project link, drift, and last sync')
  .action(async () => {
    const local = loadLocalConfig();
    if (!local) {
      console.log(chalk.red('✗ Not linked. Run: kekkai init'));
      return;
    }

    const token = requireToken();

    console.log(chalk.bold('\nProject:     ') + local.projectName);
    console.log(chalk.bold('Environment: ') + local.environmentName);
    console.log(chalk.bold('Linked:      ') + chalk.green('✓') + chalk.gray(' (.kekkai/config.json)'));

    if (!fs.existsSync('.env')) {
      console.log(chalk.yellow('\nNo local .env file found. Run: kekkai pull'));
      return;
    }

    const spinner = ora('Checking drift...').start();
    const res = await apiFetch('/api/sync/pull', {
      method: 'POST',
      body: JSON.stringify({ environmentId: local.environmentId }),
    }, token);
    spinner.stop();

    if (!res.ok) { console.log(chalk.yellow('\nCould not reach API.')); return; }

    const { secrets: remote } = await res.json();
    const current = parseEnvFile('.env');

    const added = Object.keys(remote).filter((k) => !(k in current)).length;
    const removed = Object.keys(current).filter((k) => !(k in remote)).length;
    const changed = Object.keys(remote).filter((k) => k in current && current[k] !== remote[k]).length;

    console.log(chalk.bold('\nLocal .env vs vault:'));
    if (changed) console.log(`  ${chalk.yellow('~')} ${changed} changed`);
    if (added) console.log(`  ${chalk.green('+')} ${added} new`);
    if (removed) console.log(`  ${chalk.red('-')} ${removed} removed`);
    if (!changed && !added && !removed) console.log(`  ${chalk.green('=')} In sync`);

    if (changed || added || removed) {
      console.log(chalk.gray('\n  Run `kekkai diff` for details, or `kekkai push` / `kekkai pull` to reconcile.'));
    }
  });

// ─── DIFF ─────────────────────────────────────────────────────────────────

program
  .command('diff')
  .description('Show diff between local .env and vault without pushing or pulling')
  .action(async () => {
    const token = requireToken();
    const local = requireLocalConfig();

    const res = await apiFetch('/api/sync/pull', {
      method: 'POST',
      body: JSON.stringify({ environmentId: local.environmentId }),
    }, token);

    if (!res.ok) { console.error(chalk.red('✗ Failed to fetch vault')); process.exit(1); }

    const { secrets: remote } = await res.json();
    const current = parseEnvFile('.env');
    const allKeys = new Set([...Object.keys(remote), ...Object.keys(current)]);

    console.log(chalk.bold(`\nDiff (vault/${local.environmentName} vs local .env):\n`));
    let hasChanges = false;

    for (const key of [...allKeys].sort()) {
      if (!(key in current)) { console.log(chalk.green(`+ ${key}`)); hasChanges = true; }
      else if (!(key in remote)) { console.log(chalk.red(`- ${key}`)); hasChanges = true; }
      else if (current[key] !== remote[key]) { console.log(chalk.yellow(`~ ${key}`) + chalk.gray(' (differs)')); hasChanges = true; }
      else console.log(chalk.gray(`  ${key}`));
    }

    if (!hasChanges) console.log(chalk.green('  No differences — vault and .env are in sync.'));
  });

// ─── GET ──────────────────────────────────────────────────────────────────

program
  .command('get <key>')
  .description('Decrypt and print a single secret value')
  .option('--copy', 'Copy to clipboard instead of printing')
  .action(async (key, opts) => {
    const token = requireToken();
    const local = requireLocalConfig();

    const listRes = await apiFetch(
      `/api/projects/${local.projectId}/environments/${local.environmentId}/secrets`,
      {}, token
    );
    const secrets: any[] = await listRes.json();
    const found = secrets.find((s) => s.key === key);
    if (!found) { console.error(chalk.red(`✗ Secret '${key}' not found`)); process.exit(1); }

    const revealRes = await apiFetch(
      `/api/projects/${local.projectId}/environments/${local.environmentId}/secrets/${found.id}/reveal`,
      {}, token
    );
    if (!revealRes.ok) {
      const err = await revealRes.json();
      console.error(chalk.red(`✗ ${err.error}`));
      process.exit(1);
    }
    const { value } = await revealRes.json();

    if (opts.copy) {
      try {
        execSync(`echo "${value}" | clip`, { stdio: 'pipe' }); // Windows
      } catch {
        try { execSync(`echo "${value}" | pbcopy`); } catch { // macOS
          try { execSync(`echo "${value}" | xclip -selection clipboard`); } catch { } // Linux
        }
      }
      console.log(chalk.green(`✓ ${key} copied to clipboard`));
    } else {
      console.log(value);
    }
  });

// ─── SET ──────────────────────────────────────────────────────────────────

program
  .command('set <key>')
  .description('Interactively add or update a single secret')
  .action(async (key) => {
    const token = requireToken();
    const local = requireLocalConfig();
    const value = await prompt(`Value for ${chalk.bold(key)}: `);

    const res = await apiFetch(
      `/api/projects/${local.projectId}/environments/${local.environmentId}/secrets`,
      { method: 'POST', body: JSON.stringify({ key, value, environmentId: local.environmentId }) },
      token
    );
    if (!res.ok) { console.error(chalk.red('✗ Failed to set secret')); process.exit(1); }
    const data = await res.json();
    console.log(chalk.green(`✓ ${key} set (v${data.version})`));
  });

// ─── UNSET ────────────────────────────────────────────────────────────────

program
  .command('unset <key>')
  .description('Remove a single secret')
  .option('--yes', 'Skip confirmation')
  .action(async (key, opts) => {
    const token = requireToken();
    const local = requireLocalConfig();

    const proceed = opts.yes || await confirm(chalk.red(`Delete '${key}' from ${local.environmentName}?`));
    if (!proceed) { console.log(chalk.gray('Cancelled.')); return; }

    const listRes = await apiFetch(
      `/api/projects/${local.projectId}/environments/${local.environmentId}/secrets`, {}, token
    );
    const secrets: any[] = await listRes.json();
    const found = secrets.find((s) => s.key === key);
    if (!found) { console.error(chalk.red(`✗ Secret '${key}' not found`)); process.exit(1); }

    const res = await apiFetch(
      `/api/projects/${local.projectId}/environments/${local.environmentId}/secrets/${found.id}`,
      { method: 'DELETE' }, token
    );
    if (!res.ok) { console.error(chalk.red('✗ Failed to delete secret')); process.exit(1); }
    console.log(chalk.green(`✓ ${key} deleted`));
  });

// ─── LIST ─────────────────────────────────────────────────────────────────

program
  .command('list')
  .description('List secret keys (no values) for the current environment')
  .action(async () => {
    const token = requireToken();
    const local = requireLocalConfig();

    const res = await apiFetch(
      `/api/projects/${local.projectId}/environments/${local.environmentId}/secrets`, {}, token
    );
    const secrets: any[] = await res.json();

    if (secrets.length === 0) { console.log(chalk.gray('No secrets. Run: kekkai push')); return; }

    const table = new Table({ head: [chalk.bold('KEY'), chalk.bold('VERSION'), chalk.bold('UPDATED')] });
    for (const s of secrets) {
      table.push([s.key, `v${s.latestVersion}`, new Date(s.updatedAt).toLocaleDateString()]);
    }
    console.log(chalk.bold(`\n${local.projectName} / ${local.environmentName} (${secrets.length} secrets)\n`));
    console.log(table.toString());
    console.log(chalk.gray('\nValues are not shown here. Use: kekkai get KEY'));
  });

// ─── HISTORY ──────────────────────────────────────────────────────────────

program
  .command('history <key>')
  .description('Show version history for a secret (no values by default)')
  .action(async (key) => {
    const token = requireToken();
    const local = requireLocalConfig();

    const listRes = await apiFetch(
      `/api/projects/${local.projectId}/environments/${local.environmentId}/secrets`, {}, token
    );
    const secrets: any[] = await listRes.json();
    const found = secrets.find((s) => s.key === key);
    if (!found) { console.error(chalk.red(`✗ Secret '${key}' not found`)); process.exit(1); }

    const res = await apiFetch(
      `/api/projects/${local.projectId}/environments/${local.environmentId}/secrets/${found.id}/history`,
      {}, token
    );
    const versions: any[] = await res.json();

    console.log(chalk.bold(`\nHistory for ${key} (${local.environmentName}):\n`));
    const table = new Table({ head: [chalk.bold('VERSION'), chalk.bold('DATE')] });
    for (const v of versions) {
      table.push([`v${v.version}`, new Date(v.createdAt).toLocaleString()]);
    }
    console.log(table.toString());
    console.log(chalk.gray('\nTo roll back: kekkai rollback ' + key + ' --version N'));
  });

// ─── ROLLBACK ─────────────────────────────────────────────────────────────

program
  .command('rollback <key>')
  .description('Restore a secret to a previous version')
  .requiredOption('--version <n>', 'Version number to restore', parseInt)
  .option('--yes', 'Skip confirmation')
  .action(async (key, opts) => {
    const token = requireToken();
    const local = requireLocalConfig();

    const proceed = opts.yes || await confirm(
      chalk.yellow(`Roll back '${key}' to v${opts.version} in ${local.environmentName}?`)
    );
    if (!proceed) { console.log(chalk.gray('Cancelled.')); return; }

    const listRes = await apiFetch(
      `/api/projects/${local.projectId}/environments/${local.environmentId}/secrets`, {}, token
    );
    const secrets: any[] = await listRes.json();
    const found = secrets.find((s) => s.key === key);
    if (!found) { console.error(chalk.red(`✗ Secret '${key}' not found`)); process.exit(1); }

    const res = await apiFetch(
      `/api/projects/${local.projectId}/environments/${local.environmentId}/secrets/${found.id}/rollback`,
      { method: 'POST', body: JSON.stringify({ version: opts.version }) }, token
    );
    if (!res.ok) { console.error(chalk.red('✗ Rollback failed')); process.exit(1); }
    const data = await res.json();
    console.log(chalk.green(`✓ ${key} rolled back to v${opts.version} (new version: v${data.newVersion})`));
  });

// ─── PROJECTS ─────────────────────────────────────────────────────────────

const projectsCmd = program.command('projects').description('Manage projects');

projectsCmd
  .command('list')
  .description('List all projects you can access')
  .action(async () => {
    const token = requireToken();
    const res = await apiFetch('/api/projects', {}, token);
    const projects: any[] = await res.json();

    if (projects.length === 0) { console.log(chalk.gray('No projects yet.')); return; }

    const table = new Table({ head: [chalk.bold('NAME'), chalk.bold('SLUG'), chalk.bold('ENVIRONMENTS')] });
    for (const p of projects) table.push([p.name, p.slug, p.environments.length]);
    console.log(table.toString());
  });

projectsCmd
  .command('create')
  .description('Create a new project')
  .action(async () => {
    const token = requireToken();
    const name = await prompt('Project name: ');
    const slug = await prompt('Slug (lowercase, hyphens): ');
    const res = await apiFetch('/api/projects', { method: 'POST', body: JSON.stringify({ name, slug }) }, token);
    if (!res.ok) { console.error(chalk.red('✗ Failed to create project')); process.exit(1); }
    const p = await res.json();
    console.log(chalk.green(`✓ Project '${p.name}' created with ${p.environments.length} environments.`));
  });

// ─── ENV ──────────────────────────────────────────────────────────────────

const envCmd = program.command('env').description('Manage environments');

envCmd
  .command('list')
  .description('List environments in the current project')
  .action(async () => {
    const token = requireToken();
    const local = requireLocalConfig();
    const res = await apiFetch(`/api/projects/${local.projectId}/environments`, {}, token);
    const envs: any[] = await res.json();
    const table = new Table({ head: [chalk.bold('NAME'), chalk.bold('SECRETS')] });
    for (const e of envs) table.push([e.name, e.secretCount]);
    console.log(table.toString());
  });

envCmd
  .command('create <name>')
  .description('Create a new environment')
  .action(async (name) => {
    const token = requireToken();
    const local = requireLocalConfig();
    const res = await apiFetch(`/api/projects/${local.projectId}/environments`, {
      method: 'POST', body: JSON.stringify({ name }),
    }, token);
    if (!res.ok) { console.error(chalk.red('✗ Failed to create environment')); process.exit(1); }
    console.log(chalk.green(`✓ Environment '${name}' created.`));
  });

envCmd
  .command('switch <name>')
  .description('Switch active environment for this directory')
  .action(async (name) => {
    const token = requireToken();
    const local = requireLocalConfig();
    const res = await apiFetch(`/api/projects/${local.projectId}/environments`, {}, token);
    const envs: any[] = await res.json();
    const found = envs.find((e) => e.name === name);
    if (!found) { console.error(chalk.red(`✗ Environment '${name}' not found`)); process.exit(1); }
    saveLocalConfig({ ...local, environmentId: found.id, environmentName: found.name });
    console.log(chalk.green(`✓ Switched to ${name}`));
  });

// ─── TEAM INVITE ──────────────────────────────────────────────────────────

program
  .command('team')
  .description('Manage team members')
  .command('invite <email>')
  .description('Invite a team member')
  .requiredOption('--role <role>', 'Role: ADMIN | DEVELOPER | VIEWER')
  .action(async (email, opts) => {
    const token = requireToken();
    const local = requireLocalConfig();
    const res = await apiFetch(`/api/projects/${local.projectId}/members`, {
      method: 'POST', body: JSON.stringify({ email, role: opts.role }),
    }, token);
    if (!res.ok) {
      const err = await res.json();
      console.error(chalk.red(`✗ ${err.error}`));
      process.exit(1);
    }
    console.log(chalk.green(`✓ ${email} invited as ${opts.role}`));
  });

// ─── AUDIT ────────────────────────────────────────────────────────────────

program
  .command('audit')
  .description('Tail recent audit log entries for the current project')
  .option('--limit <n>', 'Number of entries', '20')
  .action(async (opts) => {
    const token = requireToken();
    const local = requireLocalConfig();
    const res = await apiFetch(
      `/api/audit?projectId=${local.projectId}&limit=${opts.limit}`, {}, token
    );
    const { logs } = await res.json();

    if (!logs?.length) { console.log(chalk.gray('No audit logs.')); return; }

    console.log(chalk.bold(`\nAudit log: ${local.projectName} / ${local.environmentName}\n`));
    const table = new Table({
      head: [chalk.bold('TIME'), chalk.bold('USER'), chalk.bold('ACTION'), chalk.bold('KEY')],
    });
    for (const log of logs) {
      table.push([
        new Date(log.createdAt).toLocaleString(),
        log.user?.email || '?',
        log.action,
        log.resourceKey || chalk.gray('-'),
      ]);
    }
    console.log(table.toString());
  });

// ─── DOCTOR ───────────────────────────────────────────────────────────────

program
  .command('doctor')
  .description('Sanity-check the local KEKKAI setup and print actionable fixes')
  .action(async () => {
    console.log(chalk.bold('\nkekkai doctor\n'));
    let issues = 0;

    // 1. gitignore checks
    if (!isInGitignore('.env')) {
      console.log(chalk.red('✗ .env is not in .gitignore'));
      console.log(chalk.gray('  Fix: echo ".env" >> .gitignore\n'));
      issues++;
    } else console.log(chalk.green('✓ .env is in .gitignore'));

    if (!isInGitignore('.kekkai')) {
      console.log(chalk.red('✗ .kekkai/ is not in .gitignore'));
      console.log(chalk.gray('  Fix: echo ".kekkai" >> .gitignore\n'));
      issues++;
    } else console.log(chalk.green('✓ .kekkai is in .gitignore'));

    // 2. Local config
    const local = loadLocalConfig();
    if (!local) {
      console.log(chalk.red('✗ No project linked'));
      console.log(chalk.gray('  Fix: kekkai init\n'));
      issues++;
    } else {
      console.log(chalk.green(`✓ Linked to ${local.projectName} / ${local.environmentName}`));
    }

    // 3. Token check
    const config = loadGlobalConfig();
    if (!config.accessToken) {
      console.log(chalk.red('✗ Not logged in'));
      console.log(chalk.gray('  Fix: kekkai login\n'));
      issues++;
    } else {
      console.log(chalk.green('✓ CLI token present'));
    }

    // 4. Network reachability
    try {
      const res = await fetch(`${getApiUrl()}/health`);
      if (res.ok) console.log(chalk.green(`✓ API reachable (${getApiUrl()})`));
      else { console.log(chalk.red(`✗ API returned ${res.status}`)); issues++; }
    } catch {
      console.log(chalk.red(`✗ Cannot reach API at ${getApiUrl()}`));
      console.log(chalk.gray('  Check your internet connection or KEKKAI_API_URL env var\n'));
      issues++;
    }

    // 5. Drift check
    if (local && config.accessToken && fs.existsSync('.env')) {
      try {
        const res = await apiFetch('/api/sync/pull', {
          method: 'POST', body: JSON.stringify({ environmentId: local.environmentId }),
        }, config.accessToken);
        if (res.ok) {
          const { secrets: remote } = await res.json();
          const current = parseEnvFile('.env');
          const changedCount = Object.keys(remote).filter(
            (k) => k in current && current[k] !== remote[k]
          ).length;
          if (changedCount > 0) {
            console.log(chalk.yellow(`⚠ ${changedCount} key(s) differ between local .env and vault`));
            console.log(chalk.gray('  Run: kekkai diff\n'));
            issues++;
          } else {
            console.log(chalk.green('✓ Local .env matches vault (no drift)'));
          }
        }
      } catch { /* skip drift check if API unreachable */ }
    }

    console.log('');
    if (issues === 0) console.log(chalk.green.bold('All checks passed. 🎉'));
    else console.log(chalk.red(`${issues} issue(s) found. See fixes above.`));
  });

// ─── SCAN ─────────────────────────────────────────────────────────────────

program
  .command('scan')
  .description('Scan the working directory for likely-secret values not tracked in KEKKAI')
  .action(async () => {
    const SECRET_PATTERNS = [
      { pattern: /(?:AKIA|ASIA)[0-9A-Z]{16}/g, label: 'AWS Access Key' },
      { pattern: /sk-[A-Za-z0-9]{48}/g, label: 'OpenAI API Key' },
      { pattern: /ghp_[A-Za-z0-9]{36}/g, label: 'GitHub PAT' },
      { pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, label: 'JWT Token' },
      { pattern: /(?:password|secret|api[_-]?key|token)\s*[:=]\s*[^\s"']{8,}/gi, label: 'Possible secret assignment' },
    ];

    console.log(chalk.bold('\nScanning for un-vaulted secrets...\n'));
    const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.next', 'build']);

    let found = 0;
    function scanDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (SKIP_DIRS.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { scanDir(full); continue; }
        if (entry.name === '.env') continue; // .env is expected to have secrets
        try {
          const content = fs.readFileSync(full, 'utf8');
          for (const { pattern, label } of SECRET_PATTERNS) {
            const matches = content.match(pattern);
            if (matches) {
              console.log(chalk.yellow(`  ${label}`) + chalk.gray(` → ${full}`));
              found += matches.length;
            }
          }
        } catch { /* skip binary/unreadable files */ }
      }
    }

    scanDir(process.cwd());
    if (found === 0) console.log(chalk.green('✓ No obvious un-vaulted secrets found.'));
    else {
      console.log('');
      console.log(chalk.yellow(`${found} potential secret(s) found. Consider: kekkai push`));
    }
  });

// ─── CLONE ────────────────────────────────────────────────────────────────

program
  .command('clone <sourceEnv> <targetEnv>')
  .description('Copy all secrets from one environment to another')
  .option('--yes', 'Skip confirmation diff')
  .action(async (sourceEnv, targetEnv, opts) => {
    const token = requireToken();
    const local = requireLocalConfig();

    const envsRes = await apiFetch(`/api/projects/${local.projectId}/environments`, {}, token);
    const envs: any[] = await envsRes.json();
    const src = envs.find((e) => e.name === sourceEnv);
    const tgt = envs.find((e) => e.name === targetEnv);
    if (!src) { console.error(chalk.red(`✗ Source environment '${sourceEnv}' not found`)); process.exit(1); }
    if (!tgt) { console.error(chalk.red(`✗ Target environment '${targetEnv}' not found`)); process.exit(1); }

    const proceed = opts.yes || await confirm(
      chalk.yellow(`Clone all secrets from '${sourceEnv}' to '${targetEnv}'? This will overwrite existing secrets in ${targetEnv}.`)
    );
    if (!proceed) { console.log(chalk.gray('Cancelled.')); return; }

    const spinner = ora('Cloning...').start();
    const res = await apiFetch(
      `/api/projects/${local.projectId}/environments/${src.id}/clone`,
      { method: 'POST', body: JSON.stringify({ targetEnvId: tgt.id }) },
      token
    );
    spinner.stop();

    if (!res.ok) { console.error(chalk.red('✗ Clone failed')); process.exit(1); }
    const data = await res.json();
    console.log(chalk.green(`✓ ${data.cloned} secret(s) cloned from ${sourceEnv} → ${targetEnv}`));
  });

program.parse();
