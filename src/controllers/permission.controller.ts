import { Response, NextFunction } from 'express';
import Permission, { PERMISSION_MODULES, PERMISSION_ACTIONS } from '../models/Permission.model';
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

// @desc    Delete permission
// @route   DELETE /api/admin/permissions/:id
// @access  Private (manage_permissions)
export const deletePermission = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const permission = await Permission.findByIdAndDelete(req.params.id);

    if (!permission) {
      return res.status(404).json({
        status: 'error',
        message: 'Permission not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Permission deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available modules and actions
// @route   GET /api/admin/permissions/options
// @access  Private (manage_permissions)
export const getPermissionOptions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      status: 'success',
      data: {
        modules: PERMISSION_MODULES,
        actions: PERMISSION_ACTIONS,
      },
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
    
    // This is a placeholder - you would implement the logic to find users with this permission
    // by checking which roles have this permission key and which users have those roles
    res.status(200).json({
      status: 'success',
      data: [],
      message: 'Feature not yet implemented',
    });
  } catch (error) {
    next(error);
  }
};
