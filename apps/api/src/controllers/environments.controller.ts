/**
 * Environments controller.
 */
import { Response } from 'express';
import { z } from 'zod';
import prisma from '../db/prisma';
import { AuthRequest } from '../middleware/auth';
import { getProjectMembership, ROLES_THAT_CAN_WRITE } from '../middleware/rbac';
import { writeAuditLog } from '../middleware/audit';
import { unwrapDek, wrapDek, KEK_VERSION } from '../crypto/kek';
import { generateDek, encryptValue, decryptValue } from '../crypto/envelope';

const CreateEnvSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/, 'Environment names must be lowercase'),
  projectId: z.string().uuid(),
});

export const listEnvironments = async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const membership = await getProjectMembership(req.user!.id, projectId);
  if (!membership.isMember) return res.status(403).json({ error: 'Access denied' });

  const envs = await prisma.environment.findMany({
    where: { projectId },
    include: { _count: { select: { secrets: true } } },
    orderBy: { name: 'asc' },
  });

  return res.json(envs.map((e) => ({
    id: e.id,
    name: e.name,
    projectId: e.projectId,
    secretCount: e._count.secrets,
  })));
};

export const createEnvironment = async (req: AuthRequest, res: Response) => {
  const parsed = CreateEnvSchema.safeParse({ ...req.body, projectId: req.params.projectId });
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });

  const { name, projectId } = parsed.data;
  const membership = await getProjectMembership(req.user!.id, projectId);
  if (!membership.isMember || !ROLES_THAT_CAN_WRITE.includes(membership.role!)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const env = await prisma.environment.create({ data: { projectId, name } });
  await writeAuditLog(req, { action: 'ENVIRONMENT_CREATED', resourceType: 'ENVIRONMENT', resourceId: env.id, projectId });
  return res.status(201).json(env);
};

export const cloneEnvironment = async (req: AuthRequest, res: Response) => {
  const { projectId, envId } = req.params;
  const { targetEnvId } = z.object({ targetEnvId: z.string().uuid() }).parse(req.body);

  const membership = await getProjectMembership(req.user!.id, projectId);
  if (!membership.isMember || !ROLES_THAT_CAN_WRITE.includes(membership.role!)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project?.wrappedDek) return res.status(400).json({ error: 'Source project has no DEK — push secrets first' });

  const dek = unwrapDek(project.wrappedDek, projectId);

  const sourceSecrets = await prisma.secret.findMany({
    where: { environmentId: envId },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
  });

  const targetProject = await prisma.environment.findUnique({
    where: { id: targetEnvId },
    select: { projectId: true },
  });
  if (!targetProject) return res.status(404).json({ error: 'Target environment not found' });

  // Get or create DEK for target project
  let targetDek = dek; // same project: same DEK
  if (targetProject.projectId !== projectId) {
    const tp = await prisma.project.findUnique({ where: { id: targetProject.projectId } });
    if (tp?.wrappedDek) {
      targetDek = unwrapDek(tp.wrappedDek, targetProject.projectId);
    } else {
      targetDek = generateDek();
      await prisma.project.update({
        where: { id: targetProject.projectId },
        data: { wrappedDek: wrapDek(targetDek, targetProject.projectId), kekVersion: KEK_VERSION },
      });
    }
  }

  let cloned = 0;
  for (const secret of sourceSecrets) {
    const v = secret.versions[0];
    if (!v) continue;
    const plaintext = decryptValue(dek, { ciphertext: v.ciphertext, nonce: v.nonce, authTag: v.authTag });
    const encrypted = encryptValue(targetDek, plaintext);

    const newSecret = await prisma.secret.upsert({
      where: { environmentId_key: { environmentId: targetEnvId, key: secret.key } },
      update: { updatedAt: new Date(), updatedById: req.user!.id },
      create: { environmentId: targetEnvId, key: secret.key, createdById: req.user!.id, updatedById: req.user!.id },
    });

    const lastV = await prisma.secretVersion.findFirst({ where: { secretId: newSecret.id }, orderBy: { version: 'desc' } });
    await prisma.secretVersion.create({
      data: {
        secretId: newSecret.id, version: (lastV?.version ?? 0) + 1,
        ciphertext: encrypted.ciphertext, nonce: encrypted.nonce, authTag: encrypted.authTag,
        kekVersion: KEK_VERSION, createdById: req.user!.id,
      },
    });
    cloned++;
  }

  await writeAuditLog(req, {
    action: 'ENVIRONMENT_CLONED',
    resourceType: 'ENVIRONMENT',
    resourceId: envId,
    projectId,
    metadata: { targetEnvId, clonedCount: cloned },
  });

  return res.json({ cloned, targetEnvId });
};
