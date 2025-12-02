import { Router } from 'express';
import {
  checkIn,
  checkOut,
  getAttendance,
  getAttendanceById,
  updateAttendance,
  markAbsent,
  getAttendanceSummary,
} from '../controllers/attendance.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { validateId, validateAttendance } from '../middleware/validation.middleware';

const router = Router();

router.use(protect);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/summary', getAttendanceSummary);
router.post('/mark-absent', authorize('admin', 'manager', 'ceo'), markAbsent);

router
  .route('/')
  .get(getAttendance);

router
  .route('/:id')
  .get(validateId, getAttendanceById)
  .put(validateId, authorize('admin', 'manager', 'ceo'), updateAttendance);

export default router;
