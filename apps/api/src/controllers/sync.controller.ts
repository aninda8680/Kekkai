/**
 * Sync controller — bulk push/pull for CLI operations.
 *
 * POST /sync/push — CLI pushes a batch of key/value pairs.
 *   Server computes the diff server-side (added, changed, unchanged).
 *   Response includes the diff so CLI can render the preview.
 *
 * POST /sync/pull — CLI pulls all secrets for an environment.
 *   v1: Returns decrypted plaintext over TLS (server-side decrypt).
 *   Both endpoints require CLI token (enforced at route layer).
 *
 * AUDIT LOGGED: every key accessed or mutated — never the values.
 */
import { Response } from 'express';
import { z } from 'zod';
import prisma from '../db/prisma';
import { AuthRequest } from '../middleware/auth';
import { writeAuditLog } from '../middleware/audit';
import { getProjectMembership, getProjectIdFromEnvironment, ROLES_THAT_CAN_WRITE } from '../middleware/rbac';
import { wrapDek, unwrapDek, KEK_VERSION } from '../crypto/kek';
import { generateDek, encryptValue, decryptValue } from '../crypto/envelope';

const PushSchema = z.object({
  environmentId: z.string().uuid(),
  secrets: z.array(z.object({
    key: z.string().min(1).max(256).regex(/^[A-Z0-9_]+$/),
    value: z.string().max(65536),
  })),
});

const PullSchema = z.object({
  environmentId: z.string().uuid().optional(),
});

async function getOrCreateDek(projectId: string): Promise<Buffer> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error('Project not found');
  if (project.wrappedDek) return unwrapDek(project.wrappedDek, projectId);
  const dek = generateDek();
  const wrapped = wrapDek(dek, projectId);
  await prisma.project.update({ where: { id: projectId }, data: { wrappedDek: wrapped, kekVersion: KEK_VERSION } });
  return dek;
}

// ─── POST /sync/push ──────────────────────────────────────────────────────

export const syncPush = async (req: AuthRequest, res: Response) => {
  const parsed = PushSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });

  const { environmentId, secrets } = parsed.data;

  const projectId = await getProjectIdFromEnvironment(environmentId);
  if (!projectId) return res.status(404).json({ error: 'Environment not found' });

  const membership = await getProjectMembership(req.user!.id, projectId);
  if (!membership.isMember || !ROLES_THAT_CAN_WRITE.includes(membership.role!)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const dek = await getOrCreateDek(projectId);

  // Load existing secrets for diff computation
  const existing = await prisma.secret.findMany({
    where: { environmentId },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
  });
  const existingMap = new Map(existing.map((s) => [s.key, s]));

  const diff: { key: string; status: 'added' | 'changed' | 'unchanged' }[] = [];
  const results: { key: string; version: number; status: string }[] = [];

  for (const { key, value } of secrets) {
    const existingSecret = existingMap.get(key);

    if (!existingSecret) {
      // New secret
      const created = await prisma.secret.create({
        data: { environmentId, key, createdById: req.user!.id, updatedById: req.user!.id },
      });
      const encrypted = encryptValue(dek, value, {
        projectId, environmentId, secretId: created.id, key, version: 1
      });
      await prisma.secretVersion.create({
        data: {
          secretId: created.id, version: 1,
          ciphertext: encrypted.ciphertext, nonce: encrypted.nonce, authTag: encrypted.authTag,
          aad: encrypted.aad,
          kekVersion: KEK_VERSION, createdById: req.user!.id,
        },
      });
      diff.push({ key, status: 'added' });
      results.push({ key, version: 1, status: 'added' });
    } else {
      // Check if value actually changed by comparing decrypted value
      const latestVersion = existingSecret.versions[0];
      if (latestVersion) {
        try {
          const currentValue = decryptValue(dek, {
            ciphertext: latestVersion.ciphertext,
            nonce: latestVersion.nonce,
            authTag: latestVersion.authTag,
          });
          if (currentValue === value) {
            diff.push({ key, status: 'unchanged' });
            continue; // Skip — no change
          }
        } catch {
          // If decryption fails, treat as changed
        }
      }

      // Value changed — create new version
      const nextVersion = (latestVersion?.version ?? 0) + 1;
      const encrypted = encryptValue(dek, value, {
        projectId, environmentId, secretId: existingSecret.id, key, version: nextVersion
      });
      await prisma.secretVersion.create({
        data: {
          secretId: existingSecret.id, version: nextVersion,
          ciphertext: encrypted.ciphertext, nonce: encrypted.nonce, authTag: encrypted.authTag,
          aad: encrypted.aad,
          kekVersion: KEK_VERSION, createdById: req.user!.id,
        },
      });
      await prisma.secret.update({
        where: { id: existingSecret.id },
        data: { updatedAt: new Date(), updatedById: req.user!.id },
      });
      diff.push({ key, status: 'changed' });
      results.push({ key, version: nextVersion, status: 'changed' });
    }
  }

  const changed = diff.filter((d) => d.status !== 'unchanged');
  if (changed.length > 0) {
    await writeAuditLog(req, {
      action: 'SYNC_PUSH',
      resourceType: 'ENVIRONMENT',
      resourceId: environmentId,
      projectId,
      environmentId,
      metadata: {
        added: diff.filter((d) => d.status === 'added').length,
        changed: diff.filter((d) => d.status === 'changed').length,
        unchanged: diff.filter((d) => d.status === 'unchanged').length,
        keys: changed.map((d) => d.key),   // key names only — never values
      },
    });
  }

  return res.json({ diff, results });
};

// ─── POST /sync/pull ──────────────────────────────────────────────────────

export const syncPull = async (req: AuthRequest, res: Response) => {
  const parsed = PullSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const environmentId = parsed.data.environmentId || req.user?.serviceEnvId;
  if (!environmentId) return res.status(400).json({ error: 'environmentId required' });

  const projectId = await getProjectIdFromEnvironment(environmentId);
  if (!projectId) return res.status(404).json({ error: 'Environment not found' });

  const membership = await getProjectMembership(req.user!.id, projectId);
  if (!membership.isMember) return res.status(403).json({ error: 'Access denied' });

  const secrets = await prisma.secret.findMany({
    where: { environmentId },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    orderBy: { key: 'asc' },
  });

  const dek = await getOrCreateDek(projectId);

  const decrypted: Record<string, string> = {};
  for (const secret of secrets) {
    const v = secret.versions[0];
    if (!v) continue;
    decrypted[secret.key] = decryptValue(dek, {
      ciphertext: v.ciphertext,
      nonce: v.nonce,
      authTag: v.authTag,
      aad: v.aad ?? undefined
    }, {
      projectId,
      environmentId: environmentId,
      secretId: secret.id,
      key: secret.key,
      version: v.version
    });
  }

  await writeAuditLog(req, {
    action: 'SYNC_PULL',
    resourceType: 'ENVIRONMENT',
    resourceId: environmentId,
    projectId,
    environmentId,
    metadata: { keyCount: Object.keys(decrypted).length },  // count only — never the keys/values
  });

  return res.json({ secrets: decrypted });
};
