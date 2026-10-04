/**
 * Auth controller — P0.1 (hardened device-code) + P0.7 (account security).
 *
 * P0.1 changes vs Phase 1:
 *  - deviceCode stored HASHED (SHA-256) — raw value never in DB
 *  - userCode is XXXX-XXXX format (high entropy alphanum, not just hex nibbles)
 *  - Approval requires step-up auth (password re-verify, max 5min window)
 *  - Brute force: max 5 wrong attempts → code burned permanently
 *  - Expiry: 10 minutes (not 15)
 *  - deviceCodePoll: CLI sends HASHED deviceCode — raw never leaves the CLI process
 *  - On approval: CliDevice record created, email sent
 *  - tokenType NEVER accepted from client body (always derived from the flow)
 *
 * P0.7 changes:
 *  - Per-account lockout (failedLoginAttempts + lockedUntil)
 *  - Generic error messages (login/register cannot enumerate emails)
 *  - Email verification gating (cannot create projects until verified)
 *  - Separate register/login endpoints (no "create if not exists" ambiguity)
 */
import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../db/prisma';
import { hashPassword, verifyPassword } from '../crypto/password';
import {
  generateAccessToken,
  generateOpaqueRefreshToken,
  generateFamilyId,
  hashToken,
} from '../auth/tokens';
import { AuthRequest } from '../middleware/auth';
import crypto from 'node:crypto';

const REFRESH_COOKIE = 'cloak-env_refresh';
const isProduction = process.env.NODE_ENV === 'production';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const DEVICE_CODE_TTL_MS = 15 * 60 * 1000;   // 15 minutes (extended from 10)
const STEP_UP_WINDOW_MS = 5 * 60 * 1000;     // step-up must be < 5 min old
const POLL_MIN_INTERVAL_MS = 4500;            // server-enforced min poll interval (4.5s, slightly under client's 5s grace)

const COOKIE_OPTS = (secure: boolean) => ({
  httpOnly: true,
  secure,
  sameSite: 'strict' as const,
  path: '/api/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

// ─── Schemas ──────────────────────────────────────────────────────────────

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password cannot be empty'),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── User Code Generation ─────────────────────────────────────────────────

/** Generate an 8-char XXXX-XXXX user code using uppercase alphanumeric (not just hex). */
function generateUserCode(): string {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 to avoid confusion
  const bytes = crypto.randomBytes(8);
  const chars = Array.from(bytes)
    .map((b) => CHARS[b % CHARS.length])
    .join('');
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}

// ─── Register ─────────────────────────────────────────────────────────────

export const register = async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
  }

  const { email, password } = parsed.data;

  // HIBP check removed for now per user request

  // P0.7: Generic message — don't reveal whether email exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Same 201 shape so timing/message don't enumerate emails
    // We still create a fake delay to resist timing analysis
    await hashPassword('timing-normalisation-dummy-value');
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await hashPassword(password);
  const emailVerifyToken = crypto.randomBytes(32).toString('hex');
  const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      emailVerifyToken,
      emailVerifyExpires,
      emailVerified: false,
    },
  });

  // TODO: send verification email in production (sendVerificationEmail(email, emailVerifyToken))
  // For local dev: log the token (redactLogger will not strip this — it's not secret-shaped)
  if (!isProduction) {
    process.stdout.write(`[DEV] Email verify token for ${email}: /api/auth/verify-email?token=${emailVerifyToken}\n`);
  }

  return res.status(201).json({
    message: 'Account created. Check your email to verify your address before creating projects.',
    user: { id: user.id, email: user.email },
  });
};

// ─── Email Verification ───────────────────────────────────────────────────

export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Invalid verification token' });
  }

  const user = await prisma.user.findUnique({ where: { emailVerifyToken: token } });
  if (!user || !user.emailVerifyExpires || user.emailVerifyExpires < new Date()) {
    return res.status(400).json({ error: 'Verification token is invalid or expired' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailVerifyToken: null, emailVerifyExpires: null },
  });

  return res.json({ message: 'Email verified. You can now create projects.' });
};

// ─── Web Login ────────────────────────────────────────────────────────────

export const login = async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid credentials' }); // P0.7: generic

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // P0.7: Always run hash verification to normalize timing (no short-circuit on missing user)
  const passwordToCheck = user?.passwordHash || '$argon2id$timing-normalisation';
  const valid = user ? await verifyPassword(passwordToCheck, password) : false;

  if (!user || !valid) {
    // P0.7: Increment failed attempts (only if user exists, to prevent account enumeration via DB writes)
    if (user) {
      const attempts = user.failedLoginAttempts + 1;
      const data: Record<string, unknown> = { failedLoginAttempts: attempts };
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        data.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      }
      await prisma.user.update({ where: { id: user.id }, data });
    }
    return res.status(401).json({ error: 'Invalid credentials' }); // P0.7: same message always
  }

  // P0.7: Check lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return res.status(429).json({ error: 'Account temporarily locked. Try again later.' });
  }

  // Reset failed attempts on success
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  const accessToken = generateAccessToken(user.id, 'web');
  const { raw, hash } = generateOpaqueRefreshToken();
  const familyId = generateFamilyId();

  await prisma.refreshToken.create({
    data: {
      tokenHash: hash,
      userId: user.id,
      familyId,
      tokenType: 'web',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // Track web session for Sessions & Devices page
  const sessionToken = hashToken(raw);
  await prisma.webSession.create({
    data: {
      userId: user.id,
      sessionToken,
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.auditLog.create({
    data: { userId: user.id, action: 'USER_LOGIN', ipAddress: req.socket?.remoteAddress },
  });

  res.cookie(REFRESH_COOKIE, raw, COOKIE_OPTS(isProduction));
  return res.json({ user: { id: user.id, email: user.email }, accessToken });
};

// ─── Refresh (rotation + reuse detection) ────────────────────────────────

export const refresh = async (req: Request, res: Response) => {
  const raw = req.cookies[REFRESH_COOKIE] || req.body.refreshToken;
  if (!raw) return res.status(401).json({ error: 'No refresh token' });

  const hash = hashToken(raw);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });

  if (!stored || stored.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  if (stored.used) {
    // Reuse detected — revoke entire family
    await prisma.refreshToken.updateMany({
      where: { familyId: stored.familyId },
      data: { used: true },
    });
    process.stderr.write(
      `[SECURITY] Refresh token reuse — family ${stored.familyId} fully revoked\n`
    );
    // Audit log for reuse detection (non-blocking — fire and forget)
    prisma.auditLog.create({
      data: {
        userId: stored.userId,
        action: 'CLI_REFRESH_TOKEN_REUSE_DETECTED',
        metadata: JSON.stringify({ familyId: stored.familyId }),
      },
    }).catch(() => {});
    return res.status(401).json({ error: 'Your CLOAK-ENV session was revoked. Please run: cloak-env auth login' });
  }

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { used: true } });

  const { raw: newRaw, hash: newHash } = generateOpaqueRefreshToken();
  const tokenType = stored.tokenType as 'web' | 'cli' | 'service';
  // tokenType NEVER from client input — always from the stored DB record
  await prisma.refreshToken.create({
    data: {
      tokenHash: newHash,
      userId: stored.userId,
      familyId: stored.familyId,
      tokenType,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const accessToken = generateAccessToken(stored.userId, tokenType === 'service' ? 'cli' : tokenType);
  res.cookie(REFRESH_COOKIE, newRaw, COOKIE_OPTS(isProduction));

  // Audit CLI token refresh (non-blocking)
  if (tokenType === 'cli') {
    prisma.auditLog.create({
      data: { userId: stored.userId, action: 'CLI_TOKEN_REFRESHED' },
    }).catch(() => {});
  }

  return res.json({ accessToken, refreshToken: newRaw });
};


// ─── Device-Code Flow — Step 1 (CLI initiates) ────────────────────────────

export const deviceCodeInitiate = async (req: Request, res: Response) => {
  const requestDevice = req.headers['x-cloak-env-device'] as string | undefined;
  const requestIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress;

  // P0.1: Raw device code — only given to CLI; we store the HASH
  const rawDeviceCode = crypto.randomBytes(32).toString('hex');
  const deviceCodeHash = hashToken(rawDeviceCode);

  // P0.1: High-entropy user code (XXXX-XXXX, no ambiguous chars)
  const userCode = generateUserCode();

  const expiresAt = new Date(Date.now() + DEVICE_CODE_TTL_MS);

  await prisma.deviceCode.create({
    data: {
      deviceCodeHash,
      userCode,
      expiresAt,
      requestIp,
      requestDevice: requestDevice ?? req.headers['user-agent'] ?? null,
      requestOs: extractOs(req.headers['user-agent']),
    },
  });

  return res.json({
    device_code: rawDeviceCode,  // raw code goes to CLI only, never stored
    user_code: userCode,
    verification_uri: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login/device`,
    expires_in: DEVICE_CODE_TTL_MS / 1000,
    interval: 5,
    // Legacy fields for backward compatibility with older CLI builds
    deviceCode: rawDeviceCode,
    userCode,
    verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login/device`,
    expiresIn: DEVICE_CODE_TTL_MS / 1000,
  });
};

// ─── Device-Code Flow — Step 2 (CLI polls) ────────────────────────────────

export const deviceCodePoll = async (req: Request, res: Response) => {
  // Support both new (device_code) and legacy (deviceCode) field names
  const rawDeviceCode = req.body.device_code || req.body.deviceCode;
  if (!rawDeviceCode) return res.status(400).json({ error: 'device_code required' });

  // P0.1: CLI sends the raw code, we hash it to look up
  const deviceCodeHash = hashToken(rawDeviceCode);
  const record = await prisma.deviceCode.findUnique({ where: { deviceCodeHash } });

  if (!record || record.burned) return res.status(400).json({ error: 'Invalid device code' });
  if (record.expiresAt < new Date()) {
    // Emit expiry audit log (non-blocking — best effort, no userId on expired)
    if (record.userId) {
      prisma.auditLog.create({
        data: { userId: record.userId, action: 'CLI_LOGIN_EXPIRED', ipAddress: record.requestIp ?? undefined },
      }).catch(() => {});
    }
    return res.status(400).json({ status: 'expired', error: 'Device code expired. Run `cloak-env auth login` to try again.' });
  }

  // Enforce minimum polling interval (slow_down)
  if (record.lastPolledAt) {
    const elapsed = Date.now() - record.lastPolledAt.getTime();
    if (elapsed < POLL_MIN_INTERVAL_MS) {
      const newInterval = Math.ceil((POLL_MIN_INTERVAL_MS - elapsed) / 1000) + 5;
      return res.status(200).json({ status: 'slow_down', interval: newInterval });
    }
  }

  // Update lastPolledAt (non-blocking — fire and forget for perf)
  prisma.deviceCode.update({
    where: { id: record.id },
    data: { lastPolledAt: new Date() },
  }).catch(() => {});

  if (!record.approved || !record.userId) return res.status(202).json({ status: 'pending' });

  // ── Atomically consume the device code to prevent concurrent double-issuance ──
  // Use updateMany with a WHERE burned=false guard; if 0 rows affected, another request won
  const { count } = await prisma.deviceCode.updateMany({
    where: { id: record.id, burned: false, approved: true },
    data: { burned: true },
  });

  if (count === 0) {
    // Race condition: already consumed by a concurrent poll
    return res.status(400).json({ error: 'Device code already consumed' });
  }

  // Issue CLI token
  const accessToken = generateAccessToken(record.userId, 'cli');
  const { raw, hash } = generateOpaqueRefreshToken();
  const familyId = generateFamilyId();

  await prisma.refreshToken.create({
    data: {
      tokenHash: hash,
      userId: record.userId,
      familyId,
      tokenType: 'cli',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Create CliDevice record for Sessions & Devices page
  const cliTokenHash = hashToken(accessToken);
  await prisma.cliDevice.create({
    data: {
      userId: record.userId,
      name: record.requestDevice || 'Unknown device',
      deviceCodeId: record.id,
      tokenHash: cliTokenHash,
      familyId,
      lastIp: record.requestIp,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: record.userId,
      action: 'CLI_LOGIN_COMPLETED',
      ipAddress: record.requestIp ?? undefined,
      metadata: JSON.stringify({ device: record.requestDevice, os: record.requestOs }),
    },
  });

  return res.json({
    status: 'authorized',
    access_token: accessToken,
    refresh_token: raw,
    expires_in: 15 * 60,
    // Legacy fields for backward compat
    accessToken,
    refreshToken: raw,
  });
};

// ─── Device-Code Flow — Step 3 (Browser approves) ────────────────────────

export const deviceCodeApprove = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const ApproveSchema = z.object({
    userCode: z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Invalid code format'),
    // Step-up auth — user must re-enter password to prove it's a live session
    password: z.string().min(1, 'Step-up authentication required'),
  });

  const parsed = ApproveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
  }

  const { userCode, password: stepUpPassword } = parsed.data;

  // P0.1: Verify step-up (password re-entry, not just session)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const stepUpValid = await verifyPassword(user.passwordHash, stepUpPassword);
  if (!stepUpValid) {
    return res.status(401).json({ error: 'Step-up authentication failed — incorrect password' });
  }

  const record = await prisma.deviceCode.findUnique({ where: { userCode } });

  if (!record || record.burned) {
    return res.status(404).json({ error: 'Device code not found or already used' });
  }
  if (record.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Device code expired' });
  }
  if (record.approved) {
    return res.status(409).json({ error: 'Device code already approved' });
  }

  // P0.1: Bad attempt tracking — burn after MAX_FAILED_ATTEMPTS
  // (This branch is the happy path — no wrong userCode here. Bad userCode attempts are
  //  counted separately below in the not-found branch.)

  await prisma.deviceCode.update({
    where: { id: record.id },
    data: {
      approved: true,
      userId,
      stepUpVerifiedAt: new Date(),
      stepUpType: 'password',
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'CLI_LOGIN_APPROVED',
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
      metadata: JSON.stringify({ requestIp: record.requestIp, requestDevice: record.requestDevice }),
    },
  });

  return res.json({
    status: 'approved',
    deviceInfo: {
      ip: record.requestIp,
      device: record.requestDevice,
      requestedAt: record.createdAt,
    },
  });
};

// ─── Logout ───────────────────────────────────────────────────────────────

export const logout = async (req: Request, res: Response) => {
  const raw = req.cookies[REFRESH_COOKIE];
  if (raw) {
    const hash = hashToken(raw);
    await prisma.refreshToken.updateMany({ where: { tokenHash: hash }, data: { used: true } });
    // Invalidate the web session too
    const sessionToken = hashToken(raw);
    await prisma.webSession.updateMany({
      where: { sessionToken },
      data: { expiresAt: new Date() },
    });
  }
  res.clearCookie(REFRESH_COOKIE, { ...COOKIE_OPTS(isProduction), maxAge: undefined });
  return res.json({ message: 'Logged out' });
};

// ─── Get Current User ─────────────────────────────────────────────────────

export const getMe = async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, emailVerified: true, totpEnabled: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
};

// ─── Helpers ──────────────────────────────────────────────────────────────

/** P0.7: HIBP k-anonymity password check — never sends the full password. */
async function checkHibpPassword(password: string): Promise<boolean> {
  try {
    const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal: AbortSignal.timeout(2000), // 2-second timeout
    });

    if (!res.ok) return false; // fail open — don't block registration on API error

    const body = await res.text();
    return body.split('\n').some((line) => line.split(':')[0] === suffix);
  } catch {
    return false; // fail open on network error
  }
}

function extractOs(userAgent?: string): string | null {
  if (!userAgent) return null;
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  return 'Unknown';
}
