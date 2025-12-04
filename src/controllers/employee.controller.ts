import { Response, NextFunction } from 'express';
import Employee from '../models/Employee.model';
import { AuthRequest } from '../middleware/auth.middleware';

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private
export const getEmployees = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const department = req.query.department as string;

    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (department) {
      query.department = department;
    }

    const total = await Employee.countDocuments(query);
    const employees = await Employee.find(query)
      .select('-password')
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: employees,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single employee
// @route   GET /api/employees/:id
// @access  Private
export const getEmployee = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const employee = await Employee.findById(req.params.id).select('-password');

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: employee,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create employee
// @route   POST /api/employees
// @access  Private (Admin/CEO)
export const createEmployee = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Generate temporary password (8 random characters)
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
    
    const employeeData = {
      ...req.body,
      password: tempPassword,
      passwordResetRequired: true, // Force password change on first login
    };

    const employee = await Employee.create(employeeData);

    // Return employee data without password hash, but include temp password for admin
    const employeeResponse = employee.toObject();
    delete employeeResponse.password;

    res.status(201).json({
      status: 'success',
      data: employeeResponse,
      temporaryPassword: tempPassword, // Send this once to admin
      message: 'Employee created. Please share the temporary password securely. User must change it on first login.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private (Admin/CEO)
export const updateEmployee = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    ).select('-password');

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: employee,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private (Admin/CEO)
export const deleteEmployee = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Employee deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
