import { Response, NextFunction } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import Employee from '../models/Employee.model';
import User from '../models/User.model';
import Role from '../models/Role.model';
import { AuthRequest } from '../middleware/auth.middleware';

// Generate JWT Token
const generateToken = (id: string): string => {
  const secret: Secret = process.env.JWT_SECRET!;
  return jwt.sign({ id }, secret, { expiresIn: process.env.JWT_EXPIRE || '7d' } as jwt.SignOptions);
};

// @desc    Register employee
// @route   POST /api/auth/register
// @access  Public (should be protected in production)
export const register = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, phone, address, department, position, salary, role } = req.body;

    // Check if employee exists
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({
        status: 'error',
        message: 'Employee already exists',
      });
    }

    // Create employee
    const employee = await Employee.create({
      name,
      email,
      password,
      phone,
      address,
      department,
      position,
      salary,
      role: role || 'employee',
    });

    const token = generateToken(employee._id.toString());

    res.status(201).json({
      status: 'success',
      data: {
        token,
        user: {
          id: employee._id,
          name: employee.name,
          email: employee.email,
          role: employee.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login employee or user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password',
      });
    }

    // Try to find in User model first (RBAC users)
    let user = await User.findOne({ email }).select('+password');
    
    if (user) {
      // RBAC user login
      const isMatch = await user.comparePassword(password);
      
      if (!isMatch) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid credentials',
        });
      }

      // Check if user is active
      if (user.status !== 'active') {
        return res.status(403).json({
          status: 'error',
          message: 'Account is inactive or suspended',
        });
      }

      // Fetch roles and permissions
      const roles = await Role.find({ _id: { $in: user.roleIds } });
      const permissionKeys = [...new Set(roles.flatMap(r => r.permissionKeys))];

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      const token = generateToken(user._id.toString());

      return res.status(200).json({
        status: 'success',
        data: {
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            roleIds: user.roleIds,
            roles: roles.map(r => ({ id: r._id, name: r.name })),
            permissions: permissionKeys,
            status: user.status,
            employeeId: user.employeeId,
          },
        },
      });
    }

    // Fallback to Employee model for backward compatibility
    const employee = await Employee.findOne({ email }).select('+password');
    
    if (!employee) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials',
      });
    }

    // Check if password matches
    const isMatch = await employee.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials',
      });
    }

    // Check if password reset is required
    if (employee.passwordResetRequired) {
      return res.status(200).json({
        status: 'success',
        passwordResetRequired: true,
        userId: employee._id,
        message: 'Password reset required. Please change your password.',
      });
    }

    // Map old role system to permissions
    const rolePermissionMap: { [key: string]: string[] } = {
      admin: ['view_dashboard', 'manage_employees', 'manage_recruitment', 'approve_leaves', 'manage_attendance', 'manage_payroll', 'manage_performance', 'manage_interns', 'manage_roles', 'manage_users', 'manage_permissions'],
      ceo: ['view_dashboard', 'view_employees', 'view_payroll', 'approve_payroll', 'view_performance', 'comment_intern_diary'],
      manager: ['view_dashboard', 'view_employees', 'approve_leaves', 'view_attendance', 'view_performance'],
      employee: ['view_dashboard', 'request_leave', 'view_leaves', 'create_attendance'],
      intern: ['view_dashboard', 'track_own_time', 'request_leave'],
    };

    const token = generateToken(employee._id.toString());

    res.status(200).json({
      status: 'success',
      data: {
        token,
        user: {
          id: employee._id,
          name: employee.name,
          email: employee.email,
          role: employee.role,
          permissions: rolePermissionMap[employee.role] || [],
          department: employee.department,
          position: employee.position,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in employee
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const employee = await Employee.findById(req.user.id);

    res.status(200).json({
      status: 'success',
      data: employee,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout employee
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
};

// @desc    Reset password (for first-time login)
// @route   POST /api/auth/reset-password
// @access  Public (with userId from login response)
export const resetPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide userId, current password and new password',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'New password must be at least 6 characters',
      });
    }

    const employee = await Employee.findById(userId).select('+password +passwordResetRequired');

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found',
      });
    }

    // Verify current password
    const isMatch = await employee.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect',
      });
    }

    // Update password and remove reset flag
    employee.password = newPassword;
    employee.passwordResetRequired = false;
    await employee.save();

    const token = generateToken(employee._id.toString());

    // Map role to permissions
    const rolePermissionMap: { [key: string]: string[] } = {
      admin: ['view_dashboard', 'manage_employees', 'manage_recruitment', 'approve_leaves', 'manage_attendance', 'manage_payroll', 'manage_performance', 'manage_interns', 'manage_roles', 'manage_users', 'manage_permissions'],
      ceo: ['view_dashboard', 'view_employees', 'view_payroll', 'approve_payroll', 'view_performance', 'comment_intern_diary'],
      manager: ['view_dashboard', 'view_employees', 'approve_leaves', 'view_attendance', 'view_performance'],
      employee: ['view_dashboard', 'request_leave', 'view_leaves', 'create_attendance'],
      intern: ['view_dashboard', 'track_own_time', 'request_leave'],
    };

    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully',
      data: {
        token,
        user: {
          id: employee._id,
          name: employee.name,
          email: employee.email,
          role: employee.role,
          permissions: rolePermissionMap[employee.role] || [],
          department: employee.department,
          position: employee.position,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
