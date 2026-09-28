/**
 * Secrets controller — P0.2 (fail-closed audit) + P0.3 (AAD) updates.
 *
 * P0.2: For /reveal — audit row is written FIRST in a transaction.
 *       If the audit write fails → 500, no plaintext returned.
 *       Fire-and-forget audit is ONLY used for metadata reads (list, history).
 *
 * P0.3: Ciphertext is bound to (projectId|environmentId|secretId|key|version) via AAD.
 *       Moving a ciphertext row to another secret will fail GCM authentication.
 *
 * P0.5: Protected environments — DEVELOPER access requires explicit EnvironmentMemberGrant.
 */
import { Response } from 'express';
import { z } from 'zod';
import prisma from '../db/prisma';
import { AuthRequest } from '../middleware/auth';
import { writeAuditLog, writeAuditLogTransactional } from '../middleware/audit';
import {
  getProjectMembership,
  getProjectIdFromEnvironment,
  ROLES_THAT_CAN_WRITE,
  canAccessProtectedEnvironment,
} from '../middleware/rbac';
import { wrapDek, unwrapDek, KEK_VERSION } from '../crypto/kek';
import { generateDek, encryptValue, decryptValue, buildSecretAad } from '../crypto/envelope';

// ─── Input Schemas ────────────────────────────────────────────────────────

const UpsertSecretSchema = z.object({
  key: z.string().min(1).max(256).regex(/^[A-Z0-9_]+$/, 'Keys must be uppercase with underscores'),
  value: z.string().min(1).max(65536),
  environmentId: z.string().uuid(),
});

// ─── DEK Helper ───────────────────────────────────────────────────────────

async function getOrCreateDek(projectId: string): Promise<Buffer> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error('Project not found');

  if (project.wrappedDek) {
    return unwrapDek(project.wrappedDek, projectId);  // P0.3: pass projectId as AAD
  }

  const dek = generateDek();
  const wrapped = wrapDek(dek, projectId);  // P0.3: pass projectId as AAD
  await prisma.project.update({
    where: { id: projectId },
    data: { wrappedDek: wrapped, kekVersion: KEK_VERSION },
  });
  return dek;
}

// ─── GET /environments/:envId/secrets (metadata only) ─────────────────────

export const listSecrets = async (req: AuthRequest, res: Response) => {
  const { envId } = req.params;

  const projectId = await getProjectIdFromEnvironment(envId);
  if (!projectId) return res.status(404).json({ error: 'Environment not found' });

  const membership = await getProjectMembership(req.user!.id, projectId);
  if (!membership.isMember) return res.status(403).json({ error: 'Access denied' });

  const secrets = await prisma.secret.findMany({
    where: { environmentId: envId },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
        select: { version: true, createdAt: true, createdById: true },
      },
    },
    orderBy: { key: 'asc' },
  });

  // Return metadata ONLY — no ciphertext, no plaintext, no AAD
  const metadata = secrets.map((s) => ({
    id: s.id,
    key: s.key,
    latestVersion: s.versions[0]?.version ?? 0,
    updatedAt: s.updatedAt,
    updatedById: s.updatedById,
    createdAt: s.createdAt,
  }));

  // Metadata reads: fire-and-forget is acceptable (P0.2: only value reads are fail-closed)
  writeAuditLog(req, {
    action: 'SECRETS_LISTED',
    resourceType: 'ENVIRONMENT',
    resourceId: envId,
    projectId,
    environmentId: envId,
    metadata: { count: metadata.length },
  });

  return res.json(metadata);
};

// ─── GET /secrets/:id/reveal (CLI only — checked at route layer) ─────────
// P0.2: Audit FIRST, reveal SECOND. If audit fails → 500, no plaintext.

export const revealSecret = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const secret = await prisma.secret.findUnique({
    where: { id },
    include: {
      versions: { orderBy: { version: 'desc' }, take: 1 },
      environment: true,
    },
  });
  if (!secret) return res.status(404).json({ error: 'Secret not found' });

  const projectId = secret.environment.projectId;
  const membership = await getProjectMembership(req.user!.id, projectId);
  if (!membership.isMember) return res.status(403).json({ error: 'Access denied' });

  // P0.5: Protected environment check
  const env = await prisma.environment.findUnique({ where: { id: secret.environmentId } });
  if (env?.protected) {
    const hasAccess = await canAccessProtectedEnvironment(req.user!.id, secret.environmentId, membership.role!);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Protected environment: DEVELOPER access requires explicit grant. Contact your OWNER/ADMIN.',
      });
    }
  }

  const version = secret.versions[0];
  if (!version) return res.status(404).json({ error: 'No versions found' });

  // P0.2: Write audit log FIRST — in a transaction.
  // If this throws, we return 500 and DO NOT return plaintext.
  try {
    await writeAuditLogTransactional(req, {
      action: 'SECRET_ACCESSED',
      resourceType: 'SECRET',
      resourceId: secret.id,
      resourceKey: secret.key,  // key name only — never the value
      projectId,
      environmentId: secret.environmentId,
    });
  } catch (err) {
    console.error('[audit] FAIL-CLOSED: audit write failed for reveal', secret.id);
    return res.status(500).json({ error: 'Audit log write failed — value not returned (fail-closed)' });
  }

  // P0.3: Build AAD context for decryption
  const aadCtx = {
    projectId,
    environmentId: secret.environmentId,
    secretId: secret.id,
    key: secret.key,
    version: version.version,
  };

  const dek = await getOrCreateDek(projectId);
  let plaintext: string;
  try {
    plaintext = decryptValue(dek, {
      ciphertext: version.ciphertext,
      nonce: version.nonce,
      authTag: version.authTag,
      aad: version.aad ?? undefined,
    }, aadCtx);
  } catch (err) {
    console.error('[decrypt] Failed for secret', secret.id, '— possible AAD mismatch or tamper');
    return res.status(500).json({ error: 'Decryption failed — data integrity error' });
  }

  return res.json({ key: secret.key, value: plaintext, version: version.version });
};

// ─── POST /secrets ────────────────────────────────────────────────────────

export const upsertSecret = async (req: AuthRequest, res: Response) => {
  const parsed = UpsertSecretSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });

  const { key, value, environmentId } = parsed.data;

  const projectId = await getProjectIdFromEnvironment(environmentId);
  if (!projectId) return res.status(404).json({ error: 'Environment not found' });

  const membership = await getProjectMembership(req.user!.id, projectId);
  if (!membership.isMember || !ROLES_THAT_CAN_WRITE.includes(membership.role!)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  // P0.5: Protected environment write check
  const env = await prisma.environment.findUnique({ where: { id: environmentId } });
  if (env?.protected && membership.role === 'DEVELOPER') {
    const hasAccess = await canAccessProtectedEnvironment(req.user!.id, environmentId, membership.role);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Protected environment — explicit grant required for write access' });
    }
  }

  // Upsert the secret key record first to get the secretId for AAD
  const secret = await prisma.secret.upsert({
    where: { environmentId_key: { environmentId, key } },
    update: { updatedAt: new Date(), updatedById: req.user!.id },
    create: { environmentId, key, createdById: req.user!.id, updatedById: req.user!.id },
  });

  const lastVersion = await prisma.secretVersion.findFirst({
    where: { secretId: secret.id },
    orderBy: { version: 'desc' },
  });
  const nextVersion = (lastVersion?.version ?? 0) + 1;

  // P0.3: Encrypt with AAD bound to this exact row
  const dek = await getOrCreateDek(projectId);
  const aadCtx = { projectId, environmentId, secretId: secret.id, key, version: nextVersion };
  const encrypted = encryptValue(dek, value, aadCtx);

  await prisma.secretVersion.create({
    data: {
      secretId: secret.id,
      version: nextVersion,
      ciphertext: encrypted.ciphertext,
      nonce: encrypted.nonce,
      authTag: encrypted.authTag,
      aad: encrypted.aad ?? null,   // store AAD bytes (not secret) for audit
      kekVersion: KEK_VERSION,
      createdById: req.user!.id,
    },
  });

  await writeAuditLog(req, {
    action: lastVersion ? 'SECRET_UPDATED' : 'SECRET_CREATED',
    resourceType: 'SECRET',
    resourceId: secret.id,
    resourceKey: key,
    projectId,
    environmentId,
  });

  return res.status(lastVersion ? 200 : 201).json({
    id: secret.id,
    key: secret.key,
    version: nextVersion,
  });
};

// ─── DELETE /secrets/:id ──────────────────────────────────────────────────

export const deleteSecret = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const secret = await prisma.secret.findUnique({
    where: { id },
    include: { environment: true },
  });
  if (!secret) return res.status(404).json({ error: 'Secret not found' });

  const projectId = secret.environment.projectId;
  const membership = await getProjectMembership(req.user!.id, projectId);
  if (!membership.isMember || !ROLES_THAT_CAN_WRITE.includes(membership.role!)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  await prisma.secret.delete({ where: { id } });

  await writeAuditLog(req, {
    action: 'SECRET_DELETED',
    resourceType: 'SECRET',
    resourceId: id,
    resourceKey: secret.key,
    projectId,
    environmentId: secret.environmentId,
  });

  return res.json({ message: 'Secret deleted' });
};

// ─── GET /secrets/:id/history ─────────────────────────────────────────────

export const getSecretHistory = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const secret = await prisma.secret.findUnique({
    where: { id },
    include: {
      environment: true,
      versions: {
        orderBy: { version: 'desc' },
        select: { version: true, createdAt: true, createdById: true, kekVersion: true },
      },
    },
  });
  if (!secret) return res.status(404).json({ error: 'Secret not found' });

  const membership = await getProjectMembership(req.user!.id, secret.environment.projectId);
  if (!membership.isMember) return res.status(403).json({ error: 'Access denied' });

  // Version history — no values, no ciphertext, no AAD bytes
  return res.json(
    secret.versions.map((v) => ({
      version: v.version,
      createdAt: v.createdAt,
      createdById: v.createdById,
      kekVersion: v.kekVersion,
    }))
  );
};

// ─── POST /secrets/:id/rollback ───────────────────────────────────────────

export const rollbackSecret = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const parsed = z.object({ version: z.number().int().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const { version } = parsed.data;

  const secret = await prisma.secret.findUnique({
    where: { id },
    include: { environment: true },
  });
  if (!secret) return res.status(404).json({ error: 'Secret not found' });

  const projectId = secret.environment.projectId;
  const membership = await getProjectMembership(req.user!.id, projectId);
  if (!membership.isMember || !ROLES_THAT_CAN_WRITE.includes(membership.role!)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const targetVersion = await prisma.secretVersion.findUnique({
    where: { secretId_version: { secretId: id, version } },
  });
  if (!targetVersion) return res.status(404).json({ error: 'Version not found' });

  const latest = await prisma.secretVersion.findFirst({
    where: { secretId: id },
    orderBy: { version: 'desc' },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  // P0.3: Re-encrypt with new AAD bound to the new version number
  // This ensures the rolled-back value gets fresh AAD context (not the old version's AAD)
  const dek = await getOrCreateDek(projectId);
  // First decrypt old version
  const oldAadCtx = {
    projectId,
    environmentId: secret.environmentId,
    secretId: id,
    key: secret.key,
    version: targetVersion.version,
  };
  const plaintext = decryptValue(dek, {
    ciphertext: targetVersion.ciphertext,
    nonce: targetVersion.nonce,
    authTag: targetVersion.authTag,
    aad: targetVersion.aad ?? undefined,
  }, oldAadCtx);

  // Re-encrypt with new version's AAD
  const newAadCtx = { ...oldAadCtx, version: nextVersion };
  const reEncrypted = encryptValue(dek, plaintext, newAadCtx);

  await prisma.secretVersion.create({
    data: {
      secretId: id,
      version: nextVersion,
      ciphertext: reEncrypted.ciphertext,
      nonce: reEncrypted.nonce,
      authTag: reEncrypted.authTag,
      aad: reEncrypted.aad ?? null,
      kekVersion: KEK_VERSION,
      createdById: req.user!.id,
    },
  });

  await prisma.secret.update({ where: { id }, data: { updatedAt: new Date(), updatedById: req.user!.id } });

  await writeAuditLog(req, {
    action: 'SECRET_ROLLED_BACK',
    resourceType: 'SECRET',
    resourceId: id,
    resourceKey: secret.key,
    projectId,
    environmentId: secret.environmentId,
    metadata: { rolledBackToVersion: version, newVersion: nextVersion },
  });

  return res.json({ key: secret.key, newVersion: nextVersion, rolledBackTo: version });
};
