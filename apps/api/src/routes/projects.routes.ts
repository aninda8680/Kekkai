import { Router } from 'express';
import { getProjects, createProject, getProject, inviteTeamMember } from '../controllers/projects.controller';
import { listEnvironments, createEnvironment, cloneEnvironment } from '../controllers/environments.controller';
import { listSecrets, upsertSecret, deleteSecret, revealSecret, getSecretHistory, rollbackSecret } from '../controllers/secrets.controller';
import { requireAuth, requireCliToken } from '../middleware/auth';
import { revealLimiter, generalLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(requireAuth);
router.use(generalLimiter);

// ── Projects ──
router.get('/', getProjects);
router.post('/', createProject);
router.get('/:projectId', getProject);
router.post('/:projectId/members', inviteTeamMember);

// ── Environments ──
router.get('/:projectId/environments', listEnvironments);
router.post('/:projectId/environments', createEnvironment);
router.post('/:projectId/environments/:envId/clone', cloneEnvironment);

// ── Secrets (metadata) — web + CLI ──
router.get('/:projectId/environments/:envId/secrets', listSecrets);
router.post('/:projectId/environments/:envId/secrets', upsertSecret);
router.delete('/:projectId/environments/:envId/secrets/:id', deleteSecret);
router.get('/:projectId/environments/:envId/secrets/:id/history', getSecretHistory);
router.post('/:projectId/environments/:envId/secrets/:id/rollback', rollbackSecret);

// ── Secret reveal — CLI ONLY ──
router.get(
  '/:projectId/environments/:envId/secrets/:id/reveal',
  requireCliToken,   // ← Checked BEFORE any business logic
  revealLimiter,
  revealSecret
);

export default router;
