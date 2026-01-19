import { Response, NextFunction } from 'express';
import Employee from '../models/Employee.model';
import User from '../models/User.model';
import Role from '../models/Role.model';
import { AuthRequest } from '../middleware/auth.middleware';

// Map old role names to new RBAC role names
const roleToRBACMapping: { [key: string]: string } = {
  'admin': 'Super Admin',
  'ceo': 'CEO',
  'manager': 'Manager',
  'hr': 'HR Admin',
  'employee': 'Employee',
  'intern': 'Intern',
};

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
      .populate('supervisor', 'name staffId designation position')
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // For each employee, find interns they supervise
    const employeesWithInterns = await Promise.all(
      employees.map(async (employee) => {
        const supervisedInterns = await Employee.find({ 
          supervisor: employee._id,
          position: 'Intern'
        }).select('name staffId universityId');
        
        return {
          ...employee.toObject(),
          supervisedInterns: supervisedInterns.length > 0 ? supervisedInterns : undefined
        };
      })
    );

    res.status(200).json({
      status: 'success',
      data: employeesWithInterns,
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
    const employee = await Employee.findById(req.params.id)
      .select('-password')
      .populate('supervisor', 'name staffId designation position');

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found',
      });
    }

    // Find interns supervised by this employee
    const supervisedInterns = await Employee.find({ 
      supervisor: employee._id,
      position: 'Intern'
    }).select('name staffId universityId');

    const employeeWithInterns = {
      ...employee.toObject(),
      supervisedInterns: supervisedInterns.length > 0 ? supervisedInterns : undefined
    };

    res.status(200).json({
      status: 'success',
      data: employeeWithInterns,
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
    
    // Automatically set role to 'intern' if position is 'Intern'
    let role = req.body.role || 'employee';
    if (req.body.position === 'Intern') {
      role = 'intern';
    }
    
    // Get the RBAC Role ID - either from form or map from old role
    let rbacRoleId = req.body.rbacRoleId;
    
    const employeeData = {
      ...req.body,
      role: role, // Ensure role is set correctly
      staffId: staffId, // Always use generated staffId
      password: tempPassword,
      passwordResetRequired: true, // Force password change on first login
    };
    
    // Remove rbacRoleId from employee data (it's for User, not Employee)
    delete employeeData.rbacRoleId;

    // Remove staffId from req.body to prevent conflicts
    if (req.body.staffId && req.body.staffId === '') {
      delete employeeData.staffId;
      employeeData.staffId = staffId;
    }

    const employee = await Employee.create(employeeData);

    // Auto-create User record with RBAC role
    try {
      let rbacRole = null;
      
      // If rbacRoleId was provided from form, use it directly
      if (rbacRoleId) {
        rbacRole = await Role.findById(rbacRoleId);
      }
      
      // Fallback: map from old role system
      if (!rbacRole) {
        const rbacRoleName = roleToRBACMapping[role] || 'Employee';
        rbacRole = await Role.findOne({ name: rbacRoleName });
      }
      
      if (rbacRole) {
        await User.create({
          name: employee.name,
          email: employee.email,
          employeeId: employee._id,
          roleIds: [rbacRole._id],
          status: 'active',
          password: employee.password, // Same password as employee
        });
        console.log(`✅ Auto-created User for ${employee.name} with role ${rbacRole.name}`);
      }
    } catch (userError: any) {
      console.log(`⚠️ Could not auto-create User for ${employee.name}: ${userError.message}`);
    }

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
    // Automatically set role to 'intern' if position is changed to 'Intern'
    if (req.body.position === 'Intern' && !req.body.role) {
      req.body.role = 'intern';
    }
    
    // Get the RBAC Role ID if provided
    const rbacRoleId = req.body.rbacRoleId;
    
    // Remove rbacRoleId from request body (it's for User, not Employee)
    const updateData = { ...req.body };
    delete updateData.rbacRoleId;
    
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      updateData,
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

    // If rbacRoleId was provided, update User record directly with it
    if (rbacRoleId) {
      try {
        const rbacRole = await Role.findById(rbacRoleId);
        
        if (rbacRole) {
          const updateResult = await User.updateOne(
            { employeeId: employee._id },
            { $set: { roleIds: [rbacRole._id], updatedAt: new Date() } }
          );
          
          if (updateResult.modifiedCount > 0) {
            console.log(`🔄 Updated User role for ${employee.name}: ${rbacRole.name}`);
          } else if (updateResult.matchedCount === 0) {
            // User doesn't exist, create one
            await User.create({
              name: employee.name,
              email: employee.email,
              employeeId: employee._id,
              roleIds: [rbacRole._id],
              status: 'active',
              password: employee.email, // Temporary password
            });
            console.log(`✅ Created User for ${employee.name} with role ${rbacRole.name}`);
          }
        }
      } catch (syncError: any) {
        console.log(`⚠️ Could not update User role for ${employee.name}: ${syncError.message}`);
      }
    } 
    // Fallback: If old role field was updated, sync to User record
    else if (req.body.role) {
      try {
        const rbacRoleName = roleToRBACMapping[req.body.role] || 'Employee';
        const rbacRole = await Role.findOne({ name: rbacRoleName });
        
        if (rbacRole) {
          const updateResult = await User.updateOne(
            { employeeId: employee._id },
            { $set: { roleIds: [rbacRole._id], updatedAt: new Date() } }
          );
          
          if (updateResult.modifiedCount > 0) {
            console.log(`🔄 Synced User role for ${employee.name}: ${rbacRoleName}`);
          }
        }
      } catch (syncError: any) {
        console.log(`⚠️ Could not sync User role for ${employee.name}: ${syncError.message}`);
      }
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
