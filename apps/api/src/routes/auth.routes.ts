import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  verifyEmail,
  deviceCodeInitiate,
  deviceCodePoll,
  deviceCodeApprove,
} from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { authLimiter, deviceApproveLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', authLimiter, logout);
router.get('/me', authLimiter, requireAuth, getMe);
router.get('/verify-email', authLimiter, verifyEmail);

// Device-code flow
router.post('/device/code', authLimiter, deviceCodeInitiate);
// Poll is called every 5s by CLI; do not use strict authLimiter
router.post('/device/token', deviceCodePoll);
router.post('/device/approve', authLimiter, requireAuth, deviceApproveLimiter, deviceCodeApprove);

export default router;
