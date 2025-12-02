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
import { protect, authorize } from '../middleware/auth.middleware';
import { validateId, validateInternTask } from '../middleware/validation.middleware';

const router = Router();

router.use(protect);

router.post('/track', validateInternTask, logTask);
router.get('/weekly', getWeeklySummary);
router.get('/', authorize('manager', 'admin', 'ceo'), getAllTracking);

router
  .route('/:id')
  .get(validateId, getTracking)
  .put(validateId, updateTracking);

router.post('/:id/submit', validateId, submitTracking);
router.post('/:id/comments', validateId, authorize('ceo'), addCeoComments);
router.get('/:id/diary', validateId, downloadDiary);

export default router;
