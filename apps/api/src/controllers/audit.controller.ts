/**
 * Audit controller — paginated audit log retrieval.
 * Filterable by project, user, action type. No values ever included.
 */
import { Response } from 'express';
import { z } from 'zod';
import prisma from '../db/prisma';
import { AuthRequest } from '../middleware/auth';
import { getProjectMembership } from '../middleware/rbac';

const AuditQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  const parsed = AuditQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid query', details: parsed.error.issues });

  const { projectId, userId, action, page, limit } = parsed.data;

  // If filtering by project, verify membership
  if (projectId) {
    const membership = await getProjectMembership(req.user!.id, projectId);
    if (!membership.isMember) return res.status(403).json({ error: 'Access denied' });
  }

  const where = {
    ...(projectId && { projectId }),
    ...(userId && { userId }),
    ...(action && { action }),
    // Non-admins can only see their own logs unless filtering by project they belong to
    ...(!projectId && { userId: req.user!.id }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        action: true,
        resourceType: true,
        resourceId: true,
        resourceKey: true,
        projectId: true,
        environmentId: true,
        ipAddress: true,
        createdAt: true,
        user: { select: { id: true, email: true, username: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return res.json({
    logs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};
