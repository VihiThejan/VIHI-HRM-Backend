import { Response, NextFunction } from 'express';
import Employee from '../models/Employee.model';
import { AuthRequest } from '../middleware/auth.middleware';

// Helper function to generate department-based staff ID
const generateStaffId = async (department: string): Promise<string> => {
  // Map departments to prefixes
  const departmentPrefixes: { [key: string]: string } = {
    'HR': 'HR',
    'Engineering': 'ENG',
    'Sales': 'SAL',
    'Marketing': 'MKT',
    'Finance': 'FIN',
    'Operations': 'OPS',
    'IT': 'IT',
    'Administration': 'ADM',
  };

  const prefix = departmentPrefixes[department] || 'EMP';

  // Find the last employee with this department prefix
  const lastEmployee = await Employee.findOne({ 
    staffId: { $regex: `^${prefix}`, $exists: true, $ne: null } 
  })
    .sort({ staffId: -1 })
    .limit(1);

  let counter = 1;
  if (lastEmployee && lastEmployee.staffId) {
    const match = lastEmployee.staffId.match(/\d+$/);
    if (match) {
      counter = parseInt(match[0]) + 1;
    }
  }

  return `${prefix}${String(counter).padStart(6, '0')}`;
};

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
        { staffId: { $regex: search, $options: 'i' } },
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
    // Always generate a new staff ID based on department
    const staffId = await generateStaffId(req.body.department);

    // Use staff ID as the temporary password
    const tempPassword = staffId;
    
    const employeeData = {
      ...req.body,
      staffId: staffId, // Always use generated staffId
      password: tempPassword,
      passwordResetRequired: true, // Force password change on first login
    };

    // Remove staffId from req.body to prevent conflicts
    if (req.body.staffId && req.body.staffId === '') {
      delete employeeData.staffId;
      employeeData.staffId = staffId;
    }

    const employee = await Employee.create(employeeData);

    // Return employee data without password hash, but include temp password for admin
    const employeeResponse = employee.toObject();
    delete employeeResponse.password;

    res.status(201).json({
      status: 'success',
      data: employeeResponse,
      temporaryPassword: tempPassword, // Send this once to admin (staff ID)
      message: `Employee created. Staff ID: ${tempPassword}. Use this as the password for first login. User must change it on first login.`,
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
