/**
 * Service tokens controller — P0.6.
 * Scoped to one project + one environment, read-only, mandatory expiry (max 90 days).
 * Token shown once, stored hashed, revocable, every use audit-logged.
 */
import { Response } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import prisma from '../db/prisma';
import { AuthRequest } from '../middleware/auth';
import { getProjectMembership } from '../middleware/rbac';
import { writeAuditLog } from '../middleware/audit';
import { hashToken } from '../auth/tokens';

const MAX_TTL_DAYS = 90;

const CreateServiceTokenSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Name: alphanumeric, hyphens, underscores'),
  environmentId: z.string().uuid(),
  ttlDays: z.number().int().min(1).max(MAX_TTL_DAYS),
});

// ─── POST /projects/:projectId/tokens ─────────────────────────────────────

export const createServiceToken = async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const parsed = CreateServiceTokenSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });

  const membership = await getProjectMembership(req.user!.id, projectId);
  if (!membership.isMember || !['OWNER', 'ADMIN'].includes(membership.role!)) {
    return res.status(403).json({ error: 'Only OWNER or ADMIN can create service tokens' });
  }

  const { name, environmentId, ttlDays } = parsed.data;

  // Verify environment belongs to this project
  const env = await prisma.environment.findUnique({ where: { id: environmentId } });
  if (!env || env.projectId !== projectId) {
    return res.status(404).json({ error: 'Environment not found in this project' });
  }

  // Generate token — raw shown once, hash stored
  const rawToken = `kekkai_svc_${crypto.randomBytes(32).toString('hex')}`;
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  const token = await prisma.serviceToken.create({
    data: {
      name,
      tokenHash,
      userId: req.user!.id,
      projectId,
      environmentId,
      scopes: ['pull'],
      expiresAt,
    },
  });

  await writeAuditLog(req, {
    action: 'SERVICE_TOKEN_CREATED',
    resourceType: 'PROJECT',
    resourceId: projectId,
    projectId,
    environmentId,
    metadata: { name, ttlDays, tokenId: token.id },
  });

  return res.status(201).json({
    id: token.id,
    name: token.name,
    token: rawToken,  // shown exactly ONCE — not stored raw
    expiresAt: token.expiresAt,
    scopes: token.scopes,
    warning: 'Store this token securely — it will not be shown again.',
  });
};

// ─── GET /projects/:projectId/tokens ──────────────────────────────────────

export const listServiceTokens = async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const membership = await getProjectMembership(req.user!.id, projectId);
  if (!membership.isMember || !['OWNER', 'ADMIN'].includes(membership.role!)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const tokens = await prisma.serviceToken.findMany({
    where: { projectId, revoked: false },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, environmentId: true, scopes: true,
      expiresAt: true, lastUsedAt: true, lastIp: true, createdAt: true,
      environment: { select: { name: true } },
    },
  });

  return res.json(
    tokens.map((t) => ({
      ...t,
      expired: t.expiresAt < new Date(),
      environmentName: t.environment.name,
    }))
  );
};

// ─── DELETE /projects/:projectId/tokens/:tokenId ──────────────────────────

export const revokeServiceToken = async (req: AuthRequest, res: Response) => {
  const { projectId, tokenId } = req.params;
  const membership = await getProjectMembership(req.user!.id, projectId);
  if (!membership.isMember || !['OWNER', 'ADMIN'].includes(membership.role!)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const token = await prisma.serviceToken.findFirst({
    where: { id: tokenId, projectId },
  });
  if (!token) return res.status(404).json({ error: 'Token not found' });

  await prisma.serviceToken.update({ where: { id: tokenId }, data: { revoked: true } });

  await writeAuditLog(req, {
    action: 'SERVICE_TOKEN_REVOKED',
    resourceType: 'PROJECT',
    resourceId: projectId,
    projectId,
    metadata: { name: token.name, tokenId },
  });

  return res.json({ message: 'Token revoked' });
};
