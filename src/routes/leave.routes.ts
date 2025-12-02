import { Router } from 'express';
import {
  getLeaves,
  getLeave,
  createLeave,
  updateLeave,
  approveLeave,
  rejectLeave,
  deleteLeave,
  getLeaveBalance,
} from '../controllers/leave.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { validateLeave, validateId } from '../middleware/validation.middleware';

const router = Router();

router.use(protect);

router.get('/balance', getLeaveBalance);

router
  .route('/')
  .get(getLeaves)
  .post(validateLeave, createLeave);

router
  .route('/:id')
  .get(validateId, getLeave)
  .put(validateId, updateLeave)
  .delete(validateId, deleteLeave);

router.put('/:id/approve', validateId, authorize('manager', 'admin', 'ceo'), approveLeave);
router.put('/:id/reject', validateId, authorize('manager', 'admin', 'ceo'), rejectLeave);

export default router;
