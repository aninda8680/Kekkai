/**
 * Redacting logger middleware.
 *
 * Patches console.log/error/warn/info to strip:
 *   - Authorization headers and Bearer tokens
 *   - Base64-shaped strings ≥32 chars (secret/ciphertext shape)
 *   - Strings matching common secret patterns (hex 40+ chars, etc.)
 *
 * Install this BEFORE any other middleware so all log output is scrubbed.
 * A test that fails CI if a secret-shaped string appears in stdout during
 * the test suite should import and call installRedactingLogger() before tests.
 */

const REDACTED = '[REDACTED]';

// Patterns that should never appear in logs
const SECRET_PATTERNS: RegExp[] = [
  // Bearer tokens in headers
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  // Base64 blobs ≥32 chars (ciphertext, wrapped DEK shapes)
  /[A-Za-z0-9+/]{32,}={0,2}/g,
  // Long hex strings ≥40 chars (SHA-256 hashes, opaque tokens)
  /[0-9a-f]{40,}/gi,
  // JWT-shaped strings
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
];

function redact(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  let result = value;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, REDACTED);
  }
  return result;
}

function wrapLogger(original: (...args: unknown[]) => void) {
  return (...args: unknown[]) => {
    const cleaned = args.map((a) =>
      typeof a === 'string' ? redact(a) : a
    );
    original.apply(console, cleaned);
  };
}

let installed = false;

export function installRedactingLogger(): void {
  if (installed) return;
  installed = true;
  console.log = wrapLogger(console.log.bind(console));
  console.error = wrapLogger(console.error.bind(console));
  console.warn = wrapLogger(console.warn.bind(console));
  console.info = wrapLogger(console.info.bind(console));
}

export { redact };
