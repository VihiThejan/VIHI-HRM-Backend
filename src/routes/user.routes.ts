import express from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  updateUserRoles,
  updateUserPermissions,
  deleteUser,
  resetUserPassword,
  updateUserStatus,
  getUserPermissions,
} from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = express.Router();

// All routes require authentication and manage_users
router.use(protect);
router.use(requirePermission('manage_users'));

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

router.put('/:id/roles', updateUserRoles);
router.put('/:id/permissions', updateUserPermissions);
router.put('/:id/password', resetUserPassword);
router.put('/:id/status', updateUserStatus);
router.get('/:id/permissions', getUserPermissions);

export default router;

