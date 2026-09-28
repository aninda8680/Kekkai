import { Router } from 'express';
import { createServiceToken, listServiceTokens, revokeServiceToken } from '../controllers/tokens.controller';
import { requireAuth, blockServiceTokens } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';

const router = Router();
router.use(requireAuth, blockServiceTokens, generalLimiter); // service tokens cannot manage tokens

router.get('/projects/:projectId/tokens', listServiceTokens);
router.post('/projects/:projectId/tokens', createServiceToken);
router.delete('/projects/:projectId/tokens/:tokenId', revokeServiceToken);

export default router;
