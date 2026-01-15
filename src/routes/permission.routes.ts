import express from 'express';
import {
  getPermissions,
  getPermissionsGrouped,
  getPermissionOptions,
  createPermission,
  updatePermission,
  deletePermission,
  getPermissionUsers,
} from '../controllers/permission.controller';
import { protect } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Options endpoint - available to any authenticated user (just metadata)
router.get('/options', getPermissionOptions);

// All other routes require manage_permissions
router.use(requirePermission('manage_permissions'));

router.route('/')
  .get(getPermissions)
  .post(createPermission);

router.get('/grouped', getPermissionsGrouped);

// Get users who have a specific permission
router.get('/:key/users', getPermissionUsers);

router.route('/:id')
  .put(updatePermission)
  .delete(deletePermission);

export default router;

