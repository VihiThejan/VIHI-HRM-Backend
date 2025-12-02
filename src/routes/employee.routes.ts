import { Router } from 'express';
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from '../controllers/employee.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { validateEmployee, validateId, validatePagination } from '../middleware/validation.middleware';

const router = Router();

router.use(protect); // All routes are protected

router
  .route('/')
  .get(validatePagination, getEmployees)
  .post(authorize('admin', 'ceo'), validateEmployee, createEmployee);

router
  .route('/:id')
  .get(validateId, getEmployee)
  .put(authorize('admin', 'ceo'), validateId, updateEmployee)
  .delete(authorize('admin', 'ceo'), validateId, deleteEmployee);

export default router;
