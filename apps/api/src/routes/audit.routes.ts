import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller';
import { requireAuth } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(requireAuth, generalLimiter);
router.get('/', getAuditLogs);

export default router;
