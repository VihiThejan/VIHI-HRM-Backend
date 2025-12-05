import express from 'express';
import {
  getPermissions,
  getPermissionsGrouped,
  createPermission,
  updatePermission,
  deletePermission,
} from '../controllers/permission.controller';
import { protect } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = express.Router();

// All routes require authentication and manage_permissions
router.use(protect);
router.use(requirePermission('manage_permissions'));

router.route('/')
  .get(getPermissions)
  .post(createPermission);

router.get('/grouped', getPermissionsGrouped);

router.route('/:id')
  .put(updatePermission)
  .delete(deletePermission);

export default router;
