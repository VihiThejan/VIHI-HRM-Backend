import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

/**
 * Middleware to check if user has required permission
 * @param permissionKey - The permission key to check
 */
export const requirePermission = (permissionKey: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
    }

    // Check if user has permissions array
    if (!req.user.permissions || !Array.isArray(req.user.permissions)) {
      return res.status(403).json({
        status: 'error',
        message: 'No permissions found for user',
      });
    }

    // Check if user has the required permission
    if (!req.user.permissions.includes(permissionKey)) {
      return res.status(403).json({
        status: 'error',
        message: `Permission denied. Required permission: ${permissionKey}`,
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has any of the required permissions
 * @param permissionKeys - Array of permission keys (user needs at least one)
 */
export const requireAnyPermission = (permissionKeys: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
    }

    if (!req.user.permissions || !Array.isArray(req.user.permissions)) {
      return res.status(403).json({
        status: 'error',
        message: 'No permissions found for user',
      });
    }

    const hasPermission = permissionKeys.some(key => 
      req.user.permissions.includes(key)
    );

    if (!hasPermission) {
      return res.status(403).json({
        status: 'error',
        message: `Permission denied. Required one of: ${permissionKeys.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has all required permissions
 * @param permissionKeys - Array of permission keys (user needs all)
 */
export const requireAllPermissions = (permissionKeys: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
    }

    if (!req.user.permissions || !Array.isArray(req.user.permissions)) {
      return res.status(403).json({
        status: 'error',
        message: 'No permissions found for user',
      });
    }

    const missingPermissions = permissionKeys.filter(key => 
      !req.user.permissions.includes(key)
    );

    if (missingPermissions.length > 0) {
      return res.status(403).json({
        status: 'error',
        message: `Permission denied. Missing: ${missingPermissions.join(', ')}`,
      });
    }

    next();
  };
};
