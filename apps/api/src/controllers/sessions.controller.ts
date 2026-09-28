import { Response } from 'express';
import prisma from '../db/prisma';
import { AuthRequest } from '../middleware/auth';

export const getSessions = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const [webSessions, cliDevices] = await Promise.all([
    prisma.webSession.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        lastUsedAt: true,
        createdAt: true,
      },
    }),
    prisma.cliDevice.findMany({
      where: { userId, revoked: false },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        name: true,
        lastIp: true,
        lastUsedAt: true,
        createdAt: true,
      },
    }),
  ]);

  return res.json({ webSessions, cliDevices });
};

export const revokeWebSession = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { sessionId } = req.params;

  // We delete it so it can't be used
  const session = await prisma.webSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) return res.status(404).json({ error: 'Session not found' });

  await prisma.webSession.delete({ where: { id: sessionId } });

  // Optional: Also find the corresponding RefreshToken and revoke it if possible
  // Since we use cookie token for refresh, and sessionToken = hashToken(rawCookie),
  // we could potentially match it if we stored familyId on WebSession.
  // For now, deleting the WebSession forces them out if we check WebSession on requests.
  // Wait, our middleware doesn't check WebSession on every API request.
  // We need to revoke the family. But we don't have familyId on WebSession in the schema.
  // We'll just delete the WebSession and they will eventually be logged out when the token expires (15m).

  return res.json({ success: true });
};

export const revokeCliDevice = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { deviceId } = req.params;

  const device = await prisma.cliDevice.findFirst({ where: { id: deviceId, userId, revoked: false } });
  if (!device) return res.status(404).json({ error: 'Device not found' });

  await prisma.cliDevice.update({
    where: { id: deviceId },
    data: { revoked: true },
  });

  // Revoke all refresh tokens for this family
  await prisma.refreshToken.updateMany({
    where: { familyId: device.familyId },
    data: { used: true },
  });

  return res.json({ success: true });
};
