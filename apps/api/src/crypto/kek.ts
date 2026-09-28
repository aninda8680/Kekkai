/**
 * KEK (Key Encryption Key) module — P0.3 updated with DEK-wrap AAD.
 *
 * AAD for DEK wrap: `projectId|kekVersion` — a wrapped DEK for project A
 * cannot be unwrapped and used as the DEK for project B.
 *
 * To swap to AWS KMS, GCP Cloud KMS, or HashiCorp Vault:
 *   change only wrapDek / unwrapDek / validateKek below.
 *   Everything else (envelope.ts, all controllers) is unaffected.
 */
import crypto from 'node:crypto';

const NONCE_BYTES = 12;

export const KEK_VERSION = 'v1';

let _kek: Buffer | null = null;

function getKek(): Buffer {
  if (_kek) return _kek;

  const raw = process.env.MASTER_KEK;
  if (!raw) throw new Error('[KEKKAI BOOT] MASTER_KEK is not set — cannot start');
  if (raw.length !== 64) throw new Error('[KEKKAI BOOT] MASTER_KEK must be exactly 64 hex characters (32 bytes)');

  _kek = Buffer.from(raw, 'hex');
  if (_kek.length !== 32) throw new Error('[KEKKAI BOOT] MASTER_KEK decoded to wrong byte length');

  return _kek;
}

/** Build canonical AAD for DEK wrapping. */
function buildDekAad(projectId: string): Buffer {
  return Buffer.from(`${projectId}|${KEK_VERSION}`, 'utf8');
}

/**
 * Wrap a DEK with the KEK using AES-256-GCM + AAD (projectId|kekVersion).
 * Format: nonce(12) || ciphertext(32) || authTag(16) = 60 bytes total → base64.
 */
export function wrapDek(dek: Buffer, projectId: string): string {
  const kek = getKek();
  const nonce = crypto.randomBytes(NONCE_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', kek, nonce);
  cipher.setAAD(buildDekAad(projectId));
  const ct = Buffer.concat([cipher.update(dek), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([nonce, ct, tag]).toString('base64');
}

/**
 * Unwrap a DEK. Requires the same projectId used at wrap time — prevents
 * a DB admin from copying a wrapped DEK from one project to another.
 * Throws on any tamper or AAD mismatch.
 */
export function unwrapDek(wrapped: string, projectId: string): Buffer {
  const kek = getKek();
  const blob = Buffer.from(wrapped, 'base64');
  if (blob.length < 28) throw new Error('Wrapped DEK is too short to be valid');

  const nonce = blob.subarray(0, 12);
  const tag = blob.subarray(blob.length - 16);
  const ct = blob.subarray(12, blob.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', kek, nonce);
  decipher.setAuthTag(tag);
  decipher.setAAD(buildDekAad(projectId));

  try {
    return Buffer.concat([decipher.update(ct), decipher.final()]);
  } catch {
    throw new Error('DEK unwrap failed — KEK mismatch, tamper, or wrong projectId');
  }
}

/** Call at boot to fail fast if KEK is missing or invalid. */
export function validateKek(): void {
  getKek(); // throws if missing or wrong length
}

// Validate immediately on import (server.ts imports this first)
validateKek();
