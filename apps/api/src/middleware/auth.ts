/**
 * Auth middleware — P0.6 updated with service token support.
 *
 * Three token types, all validated server-side:
 *   'web'     — issued by web login, expires 15min, no value endpoints
 *   'cli'     — issued by device-code flow, expires 15min (refresh 30d)
 *   'service' — issued by `cloak-env token create`, scoped to one env, read-only
 *
 * tokenType NEVER accepted from client input — always derived from:
 *   - JWT claim for web/cli tokens
 *   - ServiceToken DB lookup for service tokens (identified by cloak-env_svc_ prefix)
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import prisma from '../db/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-do-not-use-in-prod';

export interface AuthUser {
  id: string;
  tokenType: 'web' | 'cli' | 'service';
  // For service tokens — scope restriction
  serviceTokenId?: string;
  serviceEnvId?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = header.slice(7);

  // P0.6: Check if this is a service token (cloak-env_svc_ prefix)
  if (token.startsWith('cloak-env_svc_')) {
    return handleServiceToken(token, req, res, next);
  }

  // JWT path for web/cli tokens
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      tokenType: 'web' | 'cli';
    };

    // tokenType MUST come from the JWT — never from the request
    if (!payload.tokenType || !['web', 'cli'].includes(payload.tokenType)) {
      return res.status(401).json({ error: 'Invalid token type claim' });
    }

    req.user = { id: payload.userId, tokenType: payload.tokenType };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

async function handleServiceToken(
  rawToken: string,
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const tokenHash = hashToken(rawToken);
  const serviceToken = await prisma.serviceToken.findUnique({
    where: { tokenHash },
  });

  if (!serviceToken || serviceToken.revoked) {
    return res.status(401).json({ error: 'Invalid service token' });
  }
  if (serviceToken.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Service token expired' });
  }

  // Update last used
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress;
  prisma.serviceToken.update({
    where: { id: serviceToken.id },
    data: { lastUsedAt: new Date(), lastIp: ip },
  }).catch(() => { /* fire and forget */ });

  req.user = {
    id: serviceToken.userId,
    tokenType: 'service',
    serviceTokenId: serviceToken.id,
    serviceEnvId: serviceToken.environmentId,
  };
  return next();
}

/**
 * Middleware — blocks web-session tokens from value-returning endpoints.
 * Use on /reveal and all /sync routes.
 */
export const requireCliToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const tokenType = req.user?.tokenType;
  if (tokenType === 'cli' || tokenType === 'service') return next();
  return res.status(403).json({
    error: 'This endpoint requires a CLI token. Use `cloak-env login` to authenticate.',
  });
};

/**
 * Middleware — service tokens can ONLY call pull and run, nothing else.
 * Prevents service token scope creep.
 */
export const blockServiceTokens = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.tokenType === 'service') {
    return res.status(403).json({
      error: 'Service tokens cannot perform this action. Use a CLI token.',
    });
  }
  return next();
};

/**
 * Middleware — validate service token is scoped to the requested environment.
 * Call on /sync routes after requireAuth.
 */
export const requireServiceTokenEnvScope = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.tokenType !== 'service') return next(); // not a service token — skip
  const requestedEnvId = req.body?.environmentId || req.params?.envId;
  if (requestedEnvId && req.user.serviceEnvId !== requestedEnvId) {
    return res.status(403).json({
      error: 'Service token is not scoped to this environment',
    });
  }
  return next();
};
