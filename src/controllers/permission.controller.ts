import { Response, NextFunction } from 'express';
import Permission from '../models/Permission.model';
import Role from '../models/Role.model';
import User from '../models/User.model';
import { AuthRequest } from '../middleware/auth.middleware';

// @desc    Get all permissions
// @route   GET /api/admin/permissions
// @access  Private (manage_permissions)
export const getPermissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { module, action } = req.query;

    let query: any = {};
    if (module) query.module = module;
    if (action) query.action = action;

    const permissions = await Permission.find(query).sort({ module: 1, action: 1 });

    res.status(200).json({
      status: 'success',
      data: permissions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get permissions grouped by module
// @route   GET /api/admin/permissions/grouped
// @access  Private (manage_permissions)
export const getPermissionsGrouped = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const permissions = await Permission.find().sort({ module: 1, action: 1 });

    // Group by module
    const grouped = permissions.reduce((acc: any, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = [];
      }
      acc[perm.module].push(perm);
      return acc;
    }, {});

    res.status(200).json({
      status: 'success',
      data: grouped,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new permission
// @route   POST /api/admin/permissions
// @access  Private (manage_permissions)
export const createPermission = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { key, module, action, description } = req.body;

    // Check if permission already exists
    const existingPermission = await Permission.findOne({ key });
    if (existingPermission) {
      return res.status(400).json({
        status: 'error',
        message: 'Permission with this key already exists',
      });
    }

    const permission = await Permission.create({
      key,
      module,
      action,
      description,
    });

    res.status(201).json({
      status: 'success',
      data: permission,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update permission
// @route   PUT /api/admin/permissions/:id
// @access  Private (manage_permissions)
export const updatePermission = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { description } = req.body;

    const permission = await Permission.findByIdAndUpdate(
      req.params.id,
      { description },
      { new: true, runValidators: true }
    );

    if (!permission) {
      return res.status(404).json({
        status: 'error',
        message: 'Permission not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: permission,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete permission (with cascade removal from roles)
// @route   DELETE /api/admin/permissions/:id
// @access  Private (manage_permissions)
export const deletePermission = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const permission = await Permission.findById(req.params.id);

    if (!permission) {
      return res.status(404).json({
        status: 'error',
        message: 'Permission not found',
      });
    }

    // Cascade: Remove this permission key from all roles that have it
    const updateResult = await Role.updateMany(
      { permissionKeys: permission.key },
      { $pull: { permissionKeys: permission.key } }
    );

    // Delete the permission
    await permission.deleteOne();

    res.status(200).json({
      status: 'success',
      message: 'Permission deleted successfully',
      rolesUpdated: updateResult.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get users who have a specific permission
// @route   GET /api/admin/permissions/:key/users
// @access  Private (manage_permissions)
export const getPermissionUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;

    // Find the permission
    const permission = await Permission.findOne({ key });
    if (!permission) {
      return res.status(404).json({
        status: 'error',
        message: 'Permission not found',
      });
    }

    // Find all roles that have this permission
    const roles = await Role.find({ permissionKeys: key });
    const roleIds = roles.map(r => r._id);

    // Find all users with these roles
    const users = await User.find({ roleIds: { $in: roleIds } })
      .populate('roleIds', 'name')
      .select('name email status');

    res.status(200).json({
      status: 'success',
      data: {
        permission,
        roles: roles.map(r => ({ _id: r._id, name: r.name })),
        users,
        totalUsers: users.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
