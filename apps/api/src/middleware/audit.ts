/**
 * Audit middleware — P0.2 updated.
 *
 * Two write modes:
 *  1. writeAuditLog           — fire-and-forget. Use for metadata reads (list, history).
 *  2. writeAuditLogTransactional — awaited, throws on failure. Use for any plaintext access:
 *       /reveal, /sync/pull, /sync/push. Caller MUST catch and return 500 without the value.
 *
 * P2.1: hash chaining — each row stores prev_hash and row_hash for integrity verification.
 */
import prisma from '../db/prisma';
import { AuthRequest } from './auth';
import crypto from 'node:crypto';

export interface AuditPayload {
  action: string;
  resourceType?: string;
  resourceId?: string;
  resourceKey?: string;   // key name only — NEVER the secret value
  projectId?: string;
  environmentId?: string;
  metadata?: Record<string, unknown>;
}

function getIp(req: AuthRequest): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

async function getLastHash(projectId?: string): Promise<string> {
  const last = await prisma.auditLog.findFirst({
    where: projectId ? { projectId } : {},
    orderBy: { createdAt: 'desc' },
    select: { rowHash: true },
  });
  return last?.rowHash ?? '0000000000000000000000000000000000000000000000000000000000000000';
}

function computeRowHash(prevHash: string, action: string, resourceKey: string | null, now: string): string {
  return crypto
    .createHash('sha256')
    .update(`${prevHash}|${action}|${resourceKey ?? ''}|${now}`)
    .digest('hex');
}

async function createAuditRow(req: AuthRequest, payload: AuditPayload): Promise<void> {
  if (!req.user?.id) return; // no user context — skip silently
  const now = new Date().toISOString();
  const prevHash = await getLastHash(payload.projectId);
  const rowHash = computeRowHash(prevHash, payload.action, payload.resourceKey ?? null, now);

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: payload.action,
      resourceType: payload.resourceType,
      resourceId: payload.resourceId,
      resourceKey: payload.resourceKey,
      projectId: payload.projectId,
      environmentId: payload.environmentId,
      ipAddress: getIp(req),
      userAgent: req.headers['user-agent'] ?? null,
      metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
      prevHash,
      rowHash,
    },
  });
}

/**
 * Fire-and-forget audit write. Errors are logged but not propagated.
 * Use for non-value reads (list secrets, history, project list, etc.).
 */
export function writeAuditLog(req: AuthRequest, payload: AuditPayload): void {
  createAuditRow(req, payload).catch((err) => {
    console.error('[audit] fire-and-forget write failed', payload.action, err?.message);
  });
}

/**
 * Transactional audit write — AWAITED, throws on failure.
 * Use this before returning ANY plaintext value.
 * Caller pattern:
 *   try { await writeAuditLogTransactional(req, payload); }
 *   catch { return res.status(500).json({ error: 'Audit failed — value not returned' }); }
 *   // only decrypt AFTER audit succeeds
 */
export async function writeAuditLogTransactional(req: AuthRequest, payload: AuditPayload): Promise<void> {
  await createAuditRow(req, payload);
}

/** Express middleware — attaches audit helper to req for use in controllers. */
export function auditAction(action: string, resourceType?: string) {
  return (req: AuthRequest, _res: any, next: any) => {
    req.auditAction = action;
    req.auditResourceType = resourceType;
    next();
  };
}

// Type augmentation
declare global {
  namespace Express {
    interface Request {
      auditAction?: string;
      auditResourceType?: string;
    }
  }
}
