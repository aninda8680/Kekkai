/**
 * CLI credential storage — P0.8.
 *
 * Priority:
 *  1. OS keychain (Windows Credential Manager / macOS Keychain / libsecret via `keytar`)
 *  2. File fallback (~/.cloak-env/credentials) with best-effort permissions + prominent warning
 *
 * Non-secret data (API URL, active projectId/envId) stays in ~/.cloak-env/config.json always.
 * The config.json file never contains tokens or refresh tokens.
 *
 * `cloak-env doctor` reports which backend is active.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const CONFIG_DIR = path.join(os.homedir(), '.cloak-env');
const CRED_FILE = path.join(CONFIG_DIR, 'credentials');
const SERVICE_NAME = 'cloak-env-cli';
const ACCOUNT_ACCESS = 'access_token';
const ACCOUNT_REFRESH = 'refresh_token';

export type StorageBackend = 'keychain' | 'file' | 'none';

let _keytar: any = null;
let _keytarTested = false;
let _backend: StorageBackend = 'none';

async function getKeytar(): Promise<any> {
  if (_keytarTested) return _keytar;
  _keytarTested = true;
  try {
    _keytar = await import('keytar');
    _backend = 'keychain';
    return _keytar;
  } catch {
    _keytar = null;
    _backend = 'file';
    return null;
  }
}

export async function getStorageBackend(): Promise<StorageBackend> {
  await getKeytar();
  return _backend;
}

// ─── OS Keychain ──────────────────────────────────────────────────────────

async function keychainGet(account: string): Promise<string | null> {
  const keytar = await getKeytar();
  if (!keytar) return null;
  try {
    return await keytar.getPassword(SERVICE_NAME, account);
  } catch { return null; }
}

async function keychainSet(account: string, value: string): Promise<boolean> {
  const keytar = await getKeytar();
  if (!keytar) return false;
  try {
    await keytar.setPassword(SERVICE_NAME, account, value);
    return true;
  } catch { return false; }
}

async function keychainDelete(account: string): Promise<boolean> {
  const keytar = await getKeytar();
  if (!keytar) return false;
  try {
    await keytar.deletePassword(SERVICE_NAME, account);
    return true;
  } catch { return false; }
}

// ─── File Fallback ────────────────────────────────────────────────────────

function ensureCredDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

function loadCredFile(): Record<string, string> {
  if (!fs.existsSync(CRED_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(CRED_FILE, 'utf8')); } catch { return {}; }
}

function saveCredFile(data: Record<string, string>): void {
  ensureCredDir();
  fs.writeFileSync(CRED_FILE, JSON.stringify(data, null, 2));

  // Best-effort permissions
  try {
    if (process.platform === 'win32') {
      // Windows: remove everyone else's access via icacls
      const username = os.userInfo().username;
      execSync(`icacls "${CRED_FILE}" /inheritance:r /grant:r "${username}:F" /deny Everyone:R`, {
        stdio: 'pipe',
      });
    } else {
      fs.chmodSync(CRED_FILE, 0o600);
    }
  } catch { /* permissions best-effort */ }
}

function fileGet(key: string): string | null {
  const data = loadCredFile();
  return data[key] ?? null;
}

function fileSet(key: string, value: string): void {
  const data = loadCredFile();
  data[key] = value;
  saveCredFile(data);
}

function fileDelete(key: string): void {
  const data = loadCredFile();
  delete data[key];
  saveCredFile(data);
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function storeAccessToken(token: string): Promise<void> {
  const ok = await keychainSet(ACCOUNT_ACCESS, token);
  if (!ok) {
    warnFileStorage();
    fileSet(ACCOUNT_ACCESS, token);
  }
}

export async function getAccessToken(): Promise<string | null> {
  const chainToken = await keychainGet(ACCOUNT_ACCESS);
  if (chainToken) return chainToken;
  return fileGet(ACCOUNT_ACCESS);
}

export async function storeRefreshToken(token: string): Promise<void> {
  const ok = await keychainSet(ACCOUNT_REFRESH, token);
  if (!ok) {
    warnFileStorage();
    fileSet(ACCOUNT_REFRESH, token);
  }
}

export async function getRefreshToken(): Promise<string | null> {
  const chainToken = await keychainGet(ACCOUNT_REFRESH);
  if (chainToken) return chainToken;
  return fileGet(ACCOUNT_REFRESH);
}

export async function clearCredentials(): Promise<void> {
  await keychainDelete(ACCOUNT_ACCESS);
  await keychainDelete(ACCOUNT_REFRESH);
  fileDelete(ACCOUNT_ACCESS);
  fileDelete(ACCOUNT_REFRESH);
}

let _warned = false;
function warnFileStorage(): void {
  if (_warned) return;
  _warned = true;
  const platform = process.platform;
  const hint = platform === 'win32'
    ? 'Install keytar to use Windows Credential Manager: npm i -g keytar'
    : platform === 'darwin'
    ? 'Install keytar to use macOS Keychain: npm i -g keytar'
    : 'Install keytar + libsecret for OS keyring: sudo apt install libsecret-1-dev && npm i -g keytar';

  process.stderr.write(
    `\n⚠  CLOAK-ENV: keytar not available — storing credentials in ${CRED_FILE}\n` +
    `   Best-effort file permissions applied, but OS keychain is more secure.\n` +
    `   ${hint}\n\n`
  );
}
