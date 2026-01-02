import { Response, NextFunction } from 'express';
import User from '../models/User.model';
import Role from '../models/Role.model';
import Employee from '../models/Employee.model';
import { AuthRequest } from '../middleware/auth.middleware';

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (manage_users)
export const getUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, roleId } = req.query;

    let query: any = {};
    if (status) query.status = status;
    if (roleId) query.roleIds = roleId;

    const users = await User.find(query)
      .populate('roleIds', 'name description')
      .populate('employeeId', 'name department position')
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private (manage_users)
export const getUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('roleIds', 'name description permissionKeys')
      .populate('employeeId', 'name email department position')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new user
// @route   POST /api/admin/users
// @access  Private (manage_users)
export const createUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, roleIds, employeeId, status } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists',
      });
    }

    // Validate roles exist
    if (roleIds && roleIds.length > 0) {
      const roles = await Role.find({ _id: { $in: roleIds } });
      if (roles.length !== roleIds.length) {
        return res.status(400).json({
          status: 'error',
          message: 'One or more invalid role IDs',
        });
      }
    }

    // Validate employee exists if provided
    if (employeeId) {
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        return res.status(400).json({
          status: 'error',
          message: 'Employee not found',
        });
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      roleIds: roleIds || [],
      employeeId,
      status: status || 'active',
    });

    const userResponse = await User.findById(user._id)
      .populate('roleIds', 'name description')
      .select('-password');

    res.status(201).json({
      status: 'success',
      data: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private (manage_users)
export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, status, employeeId } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Check email uniqueness if changed
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Email already in use',
        });
      }
    }

    // Validate employee exists if provided
    if (employeeId) {
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        return res.status(400).json({
          status: 'error',
          message: 'Employee not found',
        });
      }
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (status) user.status = status;
    if (employeeId !== undefined) user.employeeId = employeeId;

    await user.save();

    const updatedUser = await User.findById(user._id)
      .populate('roleIds', 'name description')
      .select('-password');

    res.status(200).json({
      status: 'success',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user roles
// @route   PUT /api/admin/users/:id/roles
// @access  Private (manage_users)
export const updateUserRoles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { roleIds } = req.body;

    if (!Array.isArray(roleIds)) {
      return res.status(400).json({
        status: 'error',
        message: 'roleIds must be an array',
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Validate all roles exist
    if (roleIds.length > 0) {
      const roles = await Role.find({ _id: { $in: roleIds } });
      if (roles.length !== roleIds.length) {
        return res.status(400).json({
          status: 'error',
          message: 'One or more invalid role IDs',
        });
      }
    }

    user.roleIds = roleIds;
    await user.save();

    const updatedUser = await User.findById(user._id)
      .populate('roleIds', 'name description permissionKeys')
      .select('-password');

    res.status(200).json({
      status: 'success',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (manage_users)
export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Prevent user from deleting themselves
    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete your own account',
      });
    }

    await user.deleteOne();

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset user password
// @route   PUT /api/admin/users/:id/password
// @access  Private (manage_users)
export const resetUserPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters',
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    user.password = password;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user status (active/inactive/suspended)
// @route   PUT /api/admin/users/:id/status
// @access  Private (manage_users)
export const updateUserStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status. Must be active, inactive, or suspended',
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Prevent user from changing their own status
    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot change your own status',
      });
    }

    user.status = status;
    await user.save();

    res.status(200).json({
      status: 'success',
      data: { status: user.status },
      message: `User status updated to ${status}`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's effective permissions
// @route   GET /api/admin/users/:id/permissions
// @access  Private (manage_users)
export const getUserPermissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('roleIds', 'name permissionKeys')
      .select('name email');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Get all permissions from all roles
    const roles = user.roleIds as any[];
    const permissionsByRole: { [roleName: string]: string[] } = {};
    const allPermissionKeys: string[] = [];

    roles.forEach((role: any) => {
      permissionsByRole[role.name] = role.permissionKeys;
      allPermissionKeys.push(...role.permissionKeys);
    });

    // Deduplicate permissions
    const uniquePermissions = [...new Set(allPermissionKeys)];

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
        roles: roles.map((r: any) => ({ _id: r._id, name: r.name })),
        permissionsByRole,
        effectivePermissions: uniquePermissions.sort(),
        totalPermissions: uniquePermissions.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
