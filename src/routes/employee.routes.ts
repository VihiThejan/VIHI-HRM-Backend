import { Router } from 'express';
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from '../controllers/employee.controller';
import { protect } from '../middleware/auth.middleware';
import { requirePermission, requireAnyPermission } from '../middleware/permission.middleware';
import { validateEmployee, validateId, validatePagination } from '../middleware/validation.middleware';

const router = Router();

router.use(protect); // All routes are protected

router
  .route('/')
  .get(requireAnyPermission(['view_employees', 'manage_employees']), validatePagination, getEmployees)
  .post(requireAnyPermission(['create_employees', 'manage_employees']), validateEmployee, createEmployee);

router
  .route('/:id')
  .get(requireAnyPermission(['view_employees', 'manage_employees']), validateId, getEmployee)
  .put(requireAnyPermission(['update_employees', 'manage_employees']), validateId, updateEmployee)
  .delete(requireAnyPermission(['delete_employees', 'manage_employees']), validateId, deleteEmployee);

export default router;
