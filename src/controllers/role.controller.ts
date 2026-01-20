import { Response, NextFunction } from 'express';
import Role from '../models/Role.model';
import Permission from '../models/Permission.model';
import User from '../models/User.model';
import { AuthRequest } from '../middleware/auth.middleware';

// @desc    Get all roles
// @route   GET /api/admin/roles
// @access  Private (manage_roles)
export const getRoles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const roles = await Role.find().sort({ name: 1 });

    // Get user count for each role
    const rolesWithCounts = await Promise.all(
      roles.map(async (role) => {
        const userCount = await User.countDocuments({ roleIds: role._id });
        return {
          ...role.toObject(),
          userCount,
        };
      })
    );

    res.status(200).json({
      status: 'success',
      data: rolesWithCounts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single role
// @route   GET /api/admin/roles/:id
// @access  Private (manage_roles)
export const getRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        status: 'error',
        message: 'Role not found',
      });
    }

    // Get permissions details
    const permissions = await Permission.find({ key: { $in: role.permissionKeys } });

    res.status(200).json({
      status: 'success',
      data: {
        ...role.toObject(),
        permissions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new role
// @route   POST /api/admin/roles
// @access  Private (manage_roles)
export const createRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, permissionKeys } = req.body;

    // Check if role already exists
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(400).json({
        status: 'error',
        message: 'Role with this name already exists',
      });
    }

    // Validate all permission keys exist
    const validPermissions = await Permission.find({ key: { $in: permissionKeys } });
    const validKeys = validPermissions.map(p => p.key);
    const invalidKeys = permissionKeys.filter((key: string) => !validKeys.includes(key));

    if (invalidKeys.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid permission keys: ${invalidKeys.join(', ')}`,
      });
    }

    const role = await Role.create({
      name,
      description,
      permissionKeys,
      isSystem: false,
    });

    res.status(201).json({
      status: 'success',
      data: role,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update role
// @route   PUT /api/admin/roles/:id
// @access  Private (manage_roles)
export const updateRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, permissionKeys } = req.body;

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        status: 'error',
        message: 'Role not found',
      });
    }

    // Validate all permission keys exist
    if (permissionKeys) {
      const validPermissions = await Permission.find({ key: { $in: permissionKeys } });
      const validKeys = validPermissions.map(p => p.key);
      const invalidKeys = permissionKeys.filter((key: string) => !validKeys.includes(key));

      if (invalidKeys.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid permission keys: ${invalidKeys.join(', ')}`,
        });
      }
    }

    // Update fields
    if (name) role.name = name;
    if (description) role.description = description;
    if (permissionKeys) role.permissionKeys = permissionKeys;

    await role.save();

    res.status(200).json({
      status: 'success',
      data: role,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete role
// @route   DELETE /api/admin/roles/:id
// @access  Private (manage_roles)
export const deleteRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        status: 'error',
        message: 'Role not found',
      });
    }

    // Prevent deletion of system roles
    if (role.isSystem) {
      return res.status(403).json({
        status: 'error',
        message: 'Cannot delete system roles',
      });
    }

    // Check if role is assigned to any users
    const usersWithRole = await User.countDocuments({ roleIds: role._id });
    if (usersWithRole > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete role. It is assigned to ${usersWithRole} user(s)`,
      });
    }

    await role.deleteOne();

    res.status(200).json({
      status: 'success',
      message: 'Role deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clone an existing role
// @route   POST /api/admin/roles/:id/clone
// @access  Private (manage_roles)
export const cloneRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;

    // Find the source role
    const sourceRole = await Role.findById(req.params.id);
    if (!sourceRole) {
      return res.status(404).json({
        status: 'error',
        message: 'Source role not found',
      });
    }

    // Check if new role name already exists
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(400).json({
        status: 'error',
        message: 'Role with this name already exists',
      });
    }

    // Create new role with same permissions
    const newRole = await Role.create({
      name: name || `${sourceRole.name} (Copy)`,
      description: description || sourceRole.description,
      permissionKeys: [...sourceRole.permissionKeys],
      isSystem: false,
    });

    res.status(201).json({
      status: 'success',
      data: newRole,
      message: `Role cloned from "${sourceRole.name}"`,
    });
  } catch (error) {
    next(error);
  }
};
