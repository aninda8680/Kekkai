/**
 * RBAC helper — P0.5 updated with protected environment access control.
 *
 * Rules:
 *  - OWNER/ADMIN: always access all environments, including protected.
 *  - DEVELOPER: access non-protected environments freely.
 *               Access protected environments ONLY with explicit EnvironmentMemberGrant.canPull.
 *  - VIEWER: metadata-only access; never receives values (enforced at route layer).
 *
 * Never trusts a projectId or role claim from the client JWT.
 */
import prisma from '../db/prisma';

export type Role = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER';

export interface MembershipResult {
  isMember: boolean;
  role: Role | null;
  projectId: string;
  memberId: string | null;  // ProjectMember.id — needed for grant lookups
}

export async function getProjectMembership(
  userId: string,
  projectId: string
): Promise<MembershipResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: { where: { userId } } },
  });

  if (!project) return { isMember: false, role: null, projectId, memberId: null };

  if (project.ownerId === userId) {
    return { isMember: true, role: 'OWNER', projectId, memberId: null };
  }

  const member = project.members[0];
  if (!member) return { isMember: false, role: null, projectId, memberId: null };

  return { isMember: true, role: member.role as Role, projectId, memberId: member.id };
}

export async function getProjectIdFromEnvironment(
  environmentId: string
): Promise<string | null> {
  const env = await prisma.environment.findUnique({ where: { id: environmentId } });
  return env?.projectId ?? null;
}

/**
 * P0.5: Check if a user can access a protected environment.
 * OWNER/ADMIN: always yes.
 * DEVELOPER: only if they have an explicit EnvironmentMemberGrant with canPull=true.
 * VIEWER: never (metadata only, enforced at route).
 */
export async function canAccessProtectedEnvironment(
  userId: string,
  environmentId: string,
  role: Role
): Promise<boolean> {
  if (role === 'OWNER' || role === 'ADMIN') return true;
  if (role === 'VIEWER') return false;
  if (role !== 'DEVELOPER') return false;

  // Find the ProjectMember for this user in the project that owns this environment
  const env = await prisma.environment.findUnique({
    where: { id: environmentId },
    select: { projectId: true },
  });
  if (!env) return false;

  const member = await prisma.projectMember.findFirst({
    where: { userId, projectId: env.projectId },
  });
  if (!member) return false;

  const grant = await prisma.environmentMemberGrant.findUnique({
    where: { memberId_environmentId: { memberId: member.id, environmentId } },
  });

  return grant?.canPull === true;
}

export const ROLES_THAT_CAN_WRITE: Role[] = ['OWNER', 'ADMIN', 'DEVELOPER'];
export const ROLES_THAT_CAN_READ: Role[] = ['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'];
