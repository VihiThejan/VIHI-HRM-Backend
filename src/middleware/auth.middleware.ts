import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Employee from '../models/Employee.model';
import User from '../models/User.model';
import Role from '../models/Role.model';

export interface AuthRequest extends Request {
  user?: any; // Contains: id, role, permissions, roleIds
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized to access this route',
      });
    }

    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
      
      // Try to find user in new User model first (RBAC users)
      let user = await User.findById(decoded.id).select('-password');
      
      if (user) {
        // Fetch roles and permissions for RBAC user
        const roles = await Role.find({ _id: { $in: user.roleIds } });
        const permissionKeys = [...new Set(roles.flatMap(r => r.permissionKeys))];
        
        req.user = {
          id: user._id,
          name: user.name,
          email: user.email,
          roleIds: user.roleIds,
          permissions: permissionKeys,
          status: user.status,
          employeeId: user.employeeId,
        };
      } else {
        // Fallback to Employee model for backward compatibility
        const employee = await Employee.findById(decoded.id).select('-password');
        
        if (!employee) {
          return res.status(401).json({
            status: 'error',
            message: 'User not found',
          });
        }
        
        // Map old role system to permissions for backward compatibility
        const rolePermissionMap: { [key: string]: string[] } = {
          admin: ['view_dashboard', 'manage_employees', 'manage_recruitment', 'approve_leaves', 'manage_attendance', 'manage_payroll', 'manage_performance', 'manage_interns', 'manage_roles', 'manage_users'],
          ceo: ['view_dashboard', 'view_employees', 'view_payroll', 'approve_payroll', 'view_performance', 'comment_intern_diary'],
          manager: ['view_dashboard', 'view_employees', 'approve_leaves', 'view_attendance', 'view_performance'],
          employee: ['view_dashboard', 'request_leave', 'view_leaves', 'create_attendance'],
          intern: ['view_dashboard', 'track_own_time', 'request_leave'],
        };
        
        req.user = {
          id: employee._id,
          name: employee.name,
          email: employee.email,
          role: employee.role,
          permissions: rolePermissionMap[employee.role] || [],
          department: employee.department,
          position: employee.position,
        };
      }

      next();
    } catch (error) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized to access this route',
      });
    }
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to access this route',
      });
    }

    next();
  };
};
