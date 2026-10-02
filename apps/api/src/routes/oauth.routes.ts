/**
 * OAuth device-code routes — canonical paths for the new CLI.
 *
 * These are the preferred routes going forward:
 *   POST /oauth/device/code     → initiate device-code flow
 *   POST /oauth/device/token    → poll for token
 *   POST /oauth/device/approve  → browser approves (requires web session)
 *   POST /oauth/token/refresh   → refresh access token (JSON body, no cookie)
 *
 * The old /api/auth/device/* routes remain in auth.routes.ts for backward compat.
 */
import { Router } from 'express';
import {
  deviceCodeInitiate,
  deviceCodePoll,
  deviceCodeApprove,
  refresh,
} from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { authLimiter, deviceApproveLimiter } from '../middleware/rateLimiter';

const router = Router();

// Device-code flow
router.post('/device/code', authLimiter, deviceCodeInitiate);
// Poll: no strict rate limit — slow_down is handled server-side per device code
router.post('/device/token', deviceCodePoll);
router.post('/device/approve', authLimiter, requireAuth, deviceApproveLimiter, deviceCodeApprove);

// Token refresh — accepts JSON body (refreshToken) OR cookie
router.post('/token/refresh', refresh);

export default router;
