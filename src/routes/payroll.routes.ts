import { Router } from 'express';
import {
  generatePayroll,
  getPayrolls,
  getPayroll,
  getEmployeePayrolls,
  updatePayroll,
  processPayroll,
  markAsPaid,
  deletePayroll,
} from '../controllers/payroll.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { validateId, validatePayroll } from '../middleware/validation.middleware';

const router = Router();

router.use(protect);

router.post('/generate', authorize('admin', 'ceo'), validatePayroll, generatePayroll);
router.get('/employee/:employeeId', getEmployeePayrolls);

router
  .route('/')
  .get(getPayrolls);

router
  .route('/:id')
  .get(validateId, getPayroll)
  .put(validateId, authorize('admin', 'ceo'), updatePayroll)
  .delete(validateId, authorize('admin', 'ceo'), deletePayroll);

router.put('/:id/process', validateId, authorize('admin', 'ceo'), processPayroll);
router.put('/:id/pay', validateId, authorize('admin', 'ceo'), markAsPaid);

export default router;
