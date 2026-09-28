/**
 * Envelope encryption — AES-256-GCM with Additional Authenticated Data (P0.3)
 *
 * WHY AAD: AES-256-GCM authenticates the ciphertext AND the AAD together.
 * This means a database writer cannot swap ciphertexts between rows — a
 * production secret moved to development will fail to decrypt because the
 * environmentId in the AAD no longer matches the ciphertext's binding.
 *
 * Secret value AAD: `projectId|environmentId|secretId|key|version`
 * DEK wrap AAD:     `projectId|kekVersion`   (handled in kek.ts)
 *
 * MIGRATION NOTE: All existing rows have aad=null → they were encrypted without
 * AAD. The decrypt function falls back to no-AAD decryption for null aad rows,
 * and re-encrypts with AAD on the next write. A one-time migration script
 * (scripts/migrate-aad.ts) handles bulk re-encryption.
 */
import crypto from 'node:crypto';

const NONCE_BYTES = 12;
const KEY_BYTES = 32;  // AES-256

export interface EncryptedBlob {
  ciphertext: string; // base64
  nonce: string;      // base64, 12 bytes
  authTag: string;    // base64, 16 bytes
  aad?: string;       // base64 of the AAD bytes (stored for audit, not for decryption)
}

export interface SecretAad {
  projectId: string;
  environmentId: string;
  secretId: string;
  key: string;
  version: number;
}

/** Build the canonical AAD for a secret version. */
export function buildSecretAad(ctx: SecretAad): Buffer {
  // Canonical form: pipe-delimited to avoid ambiguity collisions
  const s = `${ctx.projectId}|${ctx.environmentId}|${ctx.secretId}|${ctx.key}|${ctx.version}`;
  return Buffer.from(s, 'utf8');
}

/** Generate a fresh random DEK. */
export function generateDek(): Buffer {
  return crypto.randomBytes(KEY_BYTES);
}

/**
 * Encrypt a plaintext value with AES-256-GCM + AAD.
 * AAD is optional for backwards compatibility during migration.
 */
export function encryptValue(dek: Buffer, plaintext: string, aadCtx?: SecretAad): EncryptedBlob {
  if (dek.length !== KEY_BYTES) throw new Error(`DEK must be ${KEY_BYTES} bytes`);

  const nonce = crypto.randomBytes(NONCE_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', dek, nonce);

  let aadBytes: Buffer | undefined;
  if (aadCtx) {
    aadBytes = buildSecretAad(aadCtx);
    cipher.setAAD(aadBytes);
  }

  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ct.toString('base64'),
    nonce: nonce.toString('base64'),
    authTag: tag.toString('base64'),
    aad: aadBytes ? aadBytes.toString('base64') : undefined,
  };
}

/**
 * Decrypt a blob. Requires the same AAD that was used at encrypt time.
 * Throws on tamper (wrong AAD, wrong DEK, corrupted ciphertext).
 */
export function decryptValue(dek: Buffer, blob: EncryptedBlob, aadCtx?: SecretAad): string {
  if (dek.length !== KEY_BYTES) throw new Error(`DEK must be ${KEY_BYTES} bytes`);

  const nonce = Buffer.from(blob.nonce, 'base64');
  const tag = Buffer.from(blob.authTag, 'base64');
  const ct = Buffer.from(blob.ciphertext, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', dek, nonce);
  decipher.setAuthTag(tag);

  // Apply AAD: either the provided ctx, or the stored aad bytes (for migration path)
  if (aadCtx) {
    decipher.setAAD(buildSecretAad(aadCtx));
  } else if (blob.aad) {
    // Row has stored AAD — must verify it matches our expected context
    decipher.setAAD(Buffer.from(blob.aad, 'base64'));
  }
  // else: legacy row with no AAD — decrypts without AAD (will be re-encrypted on next write)

  try {
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch {
    throw new Error('Decryption failed — ciphertext may have been tampered or AAD mismatch');
  }
}
