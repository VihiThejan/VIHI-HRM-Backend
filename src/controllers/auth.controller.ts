import { Response, NextFunction } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import Employee from '../models/Employee.model';
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

// @desc    Login employee
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

    // Find employee and include password
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
