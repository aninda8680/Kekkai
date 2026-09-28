import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';
import { getSessions, revokeWebSession, revokeCliDevice } from '../controllers/sessions.controller';

const router = Router();
router.use(requireAuth, generalLimiter);

router.get('/', getSessions);
router.delete('/web/:sessionId', revokeWebSession);
router.delete('/cli/:deviceId', revokeCliDevice);

export default router;
