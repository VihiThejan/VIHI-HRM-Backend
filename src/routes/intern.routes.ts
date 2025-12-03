import { Router } from 'express';
import {
  logTask,
  getWeeklySummary,
  getTracking,
  updateTracking,
  addCeoComments,
  downloadDiary,
  submitTracking,
  getAllTracking,
} from '../controllers/intern.controller';
import { protect } from '../middleware/auth.middleware';
import { requirePermission, requireAnyPermission } from '../middleware/permission.middleware';
import { validateId, validateInternTask } from '../middleware/validation.middleware';

const router = Router();

router.use(protect);

router.post('/track', requirePermission('track_own_time'), validateInternTask, logTask);
router.get('/weekly', requirePermission('track_own_time'), getWeeklySummary);
router.get('/', requireAnyPermission(['view_interns', 'manage_interns']), getAllTracking);

router
  .route('/:id')
  .get(validateId, requireAnyPermission(['track_own_time', 'view_interns', 'manage_interns']), getTracking)
  .put(validateId, requireAnyPermission(['track_own_time', 'manage_interns']), updateTracking);

router.post('/:id/submit', validateId, requirePermission('track_own_time'), submitTracking);
router.post('/:id/comments', validateId, requirePermission('comment_intern_diary'), addCeoComments);
router.get('/:id/diary', validateId, requireAnyPermission(['track_own_time', 'view_interns', 'manage_interns']), downloadDiary);

export default router;
