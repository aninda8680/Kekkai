/**
 * KEKKAI API server — P2 updated.
 *
 * Boot order (order matters — do NOT rearrange):
 *  1. Install redacting logger (console scrubbing)
 *  2. Validate all required env vars (Zod, fail fast, never print values)
 *  3. Validate KEK is present and correct length
 *  4. Build Express app with middleware
 *  5. Set trust proxy for Render/Railway (P0.9)
 *  6. Mount routes
 *  7. Global error handler (sanitized errors)
 *  8. Graceful shutdown
 */
import { installRedactingLogger } from './middleware/redactLogger';

// ① Redacting logger first
installRedactingLogger();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { z } from 'zod';

// ② Validate env vars at boot (fail fast, never print values)
const EnvSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  MASTER_KEK: z.string().length(64, 'MASTER_KEK must be exactly 64 hex characters'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  FRONTEND_URL: z.string().url().optional(),
  REDIS_URL: z.string().optional(),
});

const envParsed = EnvSchema.safeParse(process.env);
if (!envParsed.success) {
  process.stderr.write('[KEKKAI BOOT] Invalid environment configuration:\n');
  for (const issue of envParsed.error.issues) {
    process.stderr.write(`  - ${issue.path.join('.')}: ${issue.message}\n`);
  }
  process.exit(1);
}

// ③ Validate KEK (imports trigger validation on module load)
import './crypto/kek';

import authRoutes from './routes/auth.routes';
import projectsRoutes from './routes/projects.routes';
import syncRoutes from './routes/sync.routes';
import auditRoutes from './routes/audit.routes';
import tokensRoutes from './routes/tokens.routes';
import sessionsRoutes from './routes/sessions.routes';
import prisma from './db/prisma';

const app = express();
const PORT = process.env.PORT || 4000;
const isProduction = process.env.NODE_ENV === 'production';

// ④ Trust proxy — required for correct IP detection on Render/Railway (P0.9)
// Set to 1 (one level of proxy) for standard PaaS reverse proxies.
// Adjust if you have multiple proxy hops (CDN + load balancer = 2).
if (isProduction) app.set('trust proxy', 1);

// ── Security headers ──
app.use(helmet({
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],    // No unsafe-inline — see next.config.ts for full CSP
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false, // Allow loading from CDN if needed
}));

// ── CORS — explicit allow-list, never '*' ──
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api', tokensRoutes);  // /api/projects/:projectId/tokens

// ── Health / Readiness ──
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
app.get('/readyz', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', db: 'ok' });
  } catch {
    res.status(503).json({ status: 'not ready', db: 'error' });
  }
});

// ── Global error handler — sanitized errors, no stack traces in production ──
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (isProduction) {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ error: err.message, stack: err.stack?.split('\n').slice(0, 5) });
  }
});

// ── Graceful shutdown ──
const server = app.listen(PORT, () => {
  process.stdout.write(`[KEKKAI] API listening on port ${PORT} (${process.env.NODE_ENV})\n`);
});

async function gracefulShutdown(signal: string) {
  process.stdout.write(`\n[KEKKAI] ${signal} received — draining connections...\n`);
  server.close(async () => {
    await prisma.$disconnect();
    process.stdout.write('[KEKKAI] Gracefully shut down.\n');
    process.exit(0);
  });
  // Force exit after 10 seconds if connections don't drain
  setTimeout(() => process.exit(1), 10_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
