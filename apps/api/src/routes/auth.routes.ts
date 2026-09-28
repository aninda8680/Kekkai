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

router.use(authLimiter);

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);
router.get('/verify-email', verifyEmail);

// Device-code flow
router.post('/device/code', deviceCodeInitiate);
router.post('/device/token', deviceCodePoll);
router.post('/device/approve', requireAuth, deviceApproveLimiter, deviceCodeApprove);

export default router;
