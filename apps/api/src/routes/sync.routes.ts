import { Router } from 'express';
import { syncPush, syncPull } from '../controllers/sync.controller';
import { requireAuth, requireCliToken } from '../middleware/auth';
import { syncLimiter } from '../middleware/rateLimiter';

const router = Router();

// Both sync endpoints are CLI-only — checked before any business logic
router.use(requireAuth, requireCliToken, syncLimiter);

router.post('/push', syncPush);
router.post('/pull', syncPull);

export default router;
