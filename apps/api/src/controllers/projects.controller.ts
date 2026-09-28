/**
 * Projects controller — list, create, get project details, team management.
 */
import { Response } from 'express';
import { z } from 'zod';
import prisma from '../db/prisma';
import { AuthRequest } from '../middleware/auth';
import { getProjectMembership, ROLES_THAT_CAN_WRITE } from '../middleware/rbac';
import { writeAuditLog } from '../middleware/audit';

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(128),
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens'),
});

const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'DEVELOPER', 'VIEWER']),
});

export const getProjects = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const projects = await prisma.project.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    include: {
      environments: { include: { _count: { select: { secrets: true } } } },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.json(
    projects.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      ownerId: p.ownerId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      environments: p.environments.map((e) => ({
        id: e.id,
        name: e.name,
        secretCount: e._count.secrets,
      })),
      memberCount: p._count.members,
    }))
  );
};

export const createProject = async (req: AuthRequest, res: Response) => {
  const parsed = CreateProjectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });

  const { name, slug } = parsed.data;

  const existing = await prisma.project.findUnique({ where: { slug } });
  if (existing) return res.status(409).json({ error: 'Slug already taken' });

  const project = await prisma.project.create({
    data: {
      name,
      slug,
      ownerId: req.user!.id,
      environments: {
        create: [{ name: 'development' }, { name: 'staging' }, { name: 'production' }],
      },
    },
    include: { environments: true },
  });

  await writeAuditLog(req, { action: 'PROJECT_CREATED', resourceType: 'PROJECT', resourceId: project.id });

  return res.status(201).json(project);
};

export const getProject = async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const membership = await getProjectMembership(req.user!.id, projectId);
  if (!membership.isMember) return res.status(403).json({ error: 'Access denied' });

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      environments: { include: { _count: { select: { secrets: true } } } },
      members: { include: { user: { select: { id: true, email: true, username: true } } } },
    },
  });
  if (!project) return res.status(404).json({ error: 'Project not found' });

  return res.json({
    id: project.id,
    name: project.name,
    slug: project.slug,
    ownerId: project.ownerId,
    createdAt: project.createdAt,
    environments: project.environments.map((e) => ({ id: e.id, name: e.name, secretCount: e._count.secrets })),
    members: project.members.map((m) => ({ userId: m.userId, role: m.role, user: m.user })),
    myRole: membership.role,
  });
};

export const inviteTeamMember = async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const parsed = InviteMemberSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const membership = await getProjectMembership(req.user!.id, projectId);
  if (!membership.isMember || !['OWNER', 'ADMIN'].includes(membership.role!)) {
    return res.status(403).json({ error: 'Only OWNER or ADMIN can invite members' });
  }

  const { email, role } = parsed.data;
  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) return res.status(404).json({ error: 'User not found. They must register first.' });

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUser.id } },
  });
  if (existing) return res.status(409).json({ error: 'User is already a member' });

  await prisma.projectMember.create({ data: { projectId, userId: targetUser.id, role } });

  await writeAuditLog(req, {
    action: 'MEMBER_INVITED',
    resourceType: 'PROJECT',
    resourceId: projectId,
    projectId,
    metadata: { invitedUserId: targetUser.id, role },
  });

  return res.status(201).json({ message: 'Member invited', userId: targetUser.id, role });
};
