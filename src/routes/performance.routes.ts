import { Router } from 'express';
import {
  getPerformanceReviews,
  getEmployeePerformance,
  getPerformanceReview,
  createPerformanceReview,
  updatePerformanceReview,
  deletePerformanceReview,
} from '../controllers/performance.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { validateId, validatePerformance } from '../middleware/validation.middleware';

const router = Router();

router.use(protect);

router.get('/employee/:employeeId', getEmployeePerformance);

router
  .route('/')
  .get(getPerformanceReviews)
  .post(authorize('manager', 'admin', 'ceo'), validatePerformance, createPerformanceReview);

router
  .route('/:id')
  .get(validateId, getPerformanceReview)
  .put(validateId, authorize('manager', 'admin', 'ceo'), updatePerformanceReview)
  .delete(validateId, authorize('admin', 'ceo'), deletePerformanceReview);

export default router;
