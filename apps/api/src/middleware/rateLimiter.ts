/**
 * Rate limiter — P0.9 updated.
 *
 * Changes from Phase 1:
 *  1. Uses Redis store via ioredis (Upstash-compatible) when REDIS_URL is set.
 *     Falls back to memory store with a warning for local dev.
 *  2. Express `trust proxy` must be set in server.ts for correct IP detection.
 *  3. Key function: authenticated → userId prefix, unauthenticated → IP.
 *  4. Service tokens have their own higher bucket (they're for CI, not interactive).
 */
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

type TokenType = 'web' | 'cli' | 'service' | undefined;

function keyGenerator(req: Request & { user?: { id: string; tokenType?: string } }): string {
  const ip = req.ip || 'unknown';
  if (req.user?.id) {
    // Authenticated: key on userId to prevent IP rotation bypasses
    return `user:${req.user.id}`;
  }
  return `ip:${ip}`;
}

function serviceKeyGenerator(req: Request & { user?: { id: string } }): string {
  if (req.user?.id) return `svc:${req.user.id}`;
  return `ip:${req.ip || 'unknown'}`;
}

// Store factory — uses Redis when REDIS_URL is present, memory otherwise
function createStore() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    if (process.env.NODE_ENV === 'production') {
      process.stderr.write(
        '[WARN] REDIS_URL not set in production — rate limiter using in-memory store. ' +
        'This resets on deploy and does not span instances. Set REDIS_URL (Upstash recommended).\n'
      );
    }
    return undefined; // express-rate-limit defaults to in-memory
  }

  // Dynamic import for optional Redis dependency (redis package v4+)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createClient } = require('redis');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { RedisStore } = require('rate-limit-redis');
    const client = createClient({ url: redisUrl });
    client.connect().catch((err: Error) => {
      process.stderr.write(`[WARN] Redis rate limiter connection failed: ${err.message}\n`);
    });
    return new RedisStore({ sendCommand: (...args: string[]) => client.sendCommand(args) });
  } catch {
    process.stderr.write('[WARN] rate-limit-redis not installed — using in-memory store. Run: npm i rate-limit-redis redis\n');
    return undefined;
  }
}

const store = createStore();

const sharedOpts = {
  windowMs: 15 * 60 * 1000,
  standardHeaders: 'draft-8' as const,
  legacyHeaders: false,
  validate: false, // Prevents express-rate-limit from throwing IPv6 validation errors
  store,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ error: 'Too many requests. Please slow down.' });
  },
};

/** Auth endpoints — tightest limit, keyed on IP (unauthenticated). */
export const authLimiter = rateLimit({
  ...sharedOpts,
  max: 10,
  windowMs: 15 * 60 * 1000,
  keyGenerator: (req) => `auth:${req.ip}`,
});

/** Secret reveal — CLI only; separate bucket per user. */
export const revealLimiter = rateLimit({
  ...sharedOpts,
  max: 30,
  keyGenerator: (req) => `reveal:${keyGenerator(req as any)}`,
});

/** Sync push/pull — CLI interactive; generous for normal dev flow. */
export const syncLimiter = rateLimit({
  ...sharedOpts,
  max: 200,     // raised from 60 — cloak-env run on every dev restart must not trip this
  keyGenerator: (req) => `sync:${keyGenerator(req as any)}`,
});

/** Service token endpoints — separate bucket, higher limit for CI automation. */
export const serviceTokenLimiter = rateLimit({
  ...sharedOpts,
  max: 500,
  windowMs: 15 * 60 * 1000,
  keyGenerator: (req) => `svc:${serviceKeyGenerator(req as any)}`,
});

/** General API — all other authenticated endpoints. */
export const generalLimiter = rateLimit({
  ...sharedOpts,
  max: 300,
  keyGenerator: (req) => `api:${keyGenerator(req as any)}`,
});

/** Device-code approval — per-user, tight. */
export const deviceApproveLimiter = rateLimit({
  ...sharedOpts,
  max: 10,
  windowMs: 15 * 60 * 1000,
  keyGenerator: (req) => `device-approve:${keyGenerator(req as any)}`,
});
