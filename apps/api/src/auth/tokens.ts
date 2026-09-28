/**
 * Token module — JWT access tokens + opaque refresh tokens.
 *
 * Access tokens: short-lived JWT (15m), carry token_type claim ("web" | "cli").
 * Refresh tokens: opaque random bytes stored HASHED in DB.
 *   - Rotated on every use.
 *   - Reuse of a rotated-out token revokes the entire family (theft signal).
 *
 * NEVER use the encryption KEK as the JWT signing key.
 */
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'node:crypto';

const ACCESS_TOKEN_SECRET =
  process.env.JWT_SECRET || (() => { throw new Error('[KEKKAI] JWT_SECRET env var is not set.'); })();

export type TokenType = 'web' | 'cli';

export interface TokenPayload {
  userId: string;
  tokenType: TokenType;
}

// ─── Access Tokens (JWT, 15 min) ────────────────────────────────────────────

export const generateAccessToken = (
  userId: string,
  tokenType: TokenType
): string => {
  return jwt.sign({ userId, tokenType }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
};

// ─── Opaque Refresh Tokens ───────────────────────────────────────────────────

/**
 * Generate a cryptographically random opaque refresh token.
 * Returns the raw token (to be returned to client once) and its SHA-256 hash
 * (to be stored in DB).
 */
export function generateOpaqueRefreshToken(): { raw: string; hash: string } {
  const raw = randomBytes(40).toString('hex');
  const hash = hashToken(raw);
  return { raw, hash };
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Generate a new family ID for a login session.
 */
export function generateFamilyId(): string {
  return randomBytes(16).toString('hex');
}
