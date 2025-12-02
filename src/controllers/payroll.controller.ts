import { Response, NextFunction } from 'express';
import Payroll from '../models/Payroll.model';
import Employee from '../models/Employee.model';
import Attendance from '../models/Attendance.model';
import { AuthRequest } from '../middleware/auth.middleware';

// @desc    Generate payroll for employee
// @route   POST /api/payroll/generate
// @access  Private (Admin/CEO)
export const generatePayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employeeId, month, year } = req.body;

    if (!employeeId || !month || !year) {
      return res.status(400).json({
        status: 'error',
        message: 'Employee ID, month, and year are required',
      });
    }

    // Check if payroll already exists
    const existingPayroll = await Payroll.findOne({ employeeId, month, year });
    if (existingPayroll) {
      return res.status(400).json({
        status: 'error',
        message: 'Payroll already generated for this period',
      });
    }

    // Get employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found',
      });
    }

    // Calculate attendance for the month
    const startDate = new Date(year, parseInt(month) - 1, 1);
    const endDate = new Date(year, parseInt(month), 0);

    const attendanceRecords = await Attendance.find({
      employeeId,
      date: { $gte: startDate, $lte: endDate },
    });

    const totalWorkingDays = endDate.getDate();
    const presentDays = attendanceRecords.filter(r => 
      r.status === 'present' || r.status === 'late'
    ).length;
    const absentDays = totalWorkingDays - presentDays;
    const lateDays = attendanceRecords.filter(r => r.status === 'late').length;

    // Calculate deductions
    const dailySalary = employee.salary / totalWorkingDays;
    const lateDeductions = lateDays * (dailySalary * 0.1); // 10% penalty for late
    const absentDeductions = absentDays * dailySalary;
    
    // Tax calculation (simple progressive tax)
    let taxRate = 0;
    if (employee.salary > 100000) {
      taxRate = 0.15;
    } else if (employee.salary > 50000) {
      taxRate = 0.10;
    } else {
      taxRate = 0.05;
    }
    const tax = employee.salary * taxRate;

    // Insurance (fixed rate)
    const insurance = employee.salary * 0.02; // 2% for insurance

    // Calculate overtime bonus (if worked more than standard hours)
    const totalHours = attendanceRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const standardMonthlyHours = totalWorkingDays * 8;
    const overtimeHours = Math.max(0, totalHours - standardMonthlyHours);
    const overtimeBonus = overtimeHours * (dailySalary / 8) * 1.5; // 1.5x for overtime

    const payroll = await Payroll.create({
      employeeId,
      month,
      year,
      baseSalary: employee.salary,
      deductions: {
        tax,
        insurance,
        lateDeductions: Math.round(lateDeductions * 100) / 100,
        other: 0,
      },
      bonuses: {
        performance: 0,
        overtime: Math.round(overtimeBonus * 100) / 100,
        other: 0,
      },
      netSalary: 0, // Will be calculated by pre-save hook
      status: 'draft',
    });

    const populatedPayroll = await Payroll.findById(payroll._id)
      .populate('employeeId', 'name email department position salary');

    res.status(201).json({
      status: 'success',
      data: populatedPayroll,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all payroll records
// @route   GET /api/payroll
// @access  Private
export const getPayrolls = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const month = req.query.month as string;
    const year = req.query.year as string;
    const status = req.query.status as string;
    const employeeId = req.query.employeeId as string;

    const query: any = {};

    // Regular employees can only see their own payroll
    if (req.user.role === 'employee' || req.user.role === 'intern') {
      query.employeeId = req.user.id;
    } else if (employeeId) {
      query.employeeId = employeeId;
    }

    if (month) {
      query.month = month;
    }

    if (year) {
      query.year = parseInt(year);
    }

    if (status) {
      query.status = status;
    }

    const total = await Payroll.countDocuments(query);
    const payrolls = await Payroll.find(query)
      .populate('employeeId', 'name email department position salary')
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ year: -1, month: -1 });

    res.status(200).json({
      status: 'success',
      data: payrolls,
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

// @desc    Get single payroll
// @route   GET /api/payroll/:id
// @access  Private
export const getPayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employeeId', 'name email department position salary');

    if (!payroll) {
      return res.status(404).json({
        status: 'error',
        message: 'Payroll not found',
      });
    }

    // Check authorization
    if (
      (req.user.role === 'employee' || req.user.role === 'intern') &&
      payroll.employeeId._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to access this payroll',
      });
    }

    res.status(200).json({
      status: 'success',
      data: payroll,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get employee payroll history
// @route   GET /api/payroll/employee/:employeeId
// @access  Private
export const getEmployeePayrolls = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employeeId } = req.params;

    // Check authorization
    if (
      (req.user.role === 'employee' || req.user.role === 'intern') &&
      employeeId !== req.user.id
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to access this payroll',
      });
    }

    const payrolls = await Payroll.find({ employeeId })
      .populate('employeeId', 'name email department position salary')
      .sort({ year: -1, month: -1 });

    res.status(200).json({
      status: 'success',
      data: payrolls,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payroll
// @route   PUT /api/payroll/:id
// @access  Private (Admin/CEO)
export const updatePayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { deductions, bonuses, status, notes } = req.body;

    let payroll = await Payroll.findById(req.params.id);

    if (!payroll) {
      return res.status(404).json({
        status: 'error',
        message: 'Payroll not found',
      });
    }

    if (payroll.status === 'paid') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot update paid payroll',
      });
    }

    if (deductions) {
      payroll.deductions = { ...payroll.deductions, ...deductions };
    }

    if (bonuses) {
      payroll.bonuses = { ...payroll.bonuses, ...bonuses };
    }

    if (status) {
      payroll.status = status;
      if (status === 'paid') {
        payroll.paidDate = new Date();
      }
    }

    if (notes) {
      payroll.notes = notes;
    }

    await payroll.save();

    const updatedPayroll = await Payroll.findById(payroll._id)
      .populate('employeeId', 'name email department position salary');

    res.status(200).json({
      status: 'success',
      data: updatedPayroll,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process payroll (mark as processed)
// @route   PUT /api/payroll/:id/process
// @access  Private (Admin/CEO)
export const processPayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payroll = await Payroll.findById(req.params.id);

    if (!payroll) {
      return res.status(404).json({
        status: 'error',
        message: 'Payroll not found',
      });
    }

    if (payroll.status !== 'draft') {
      return res.status(400).json({
        status: 'error',
        message: 'Payroll has already been processed',
      });
    }

    payroll.status = 'processed';
    await payroll.save();

    const updatedPayroll = await Payroll.findById(payroll._id)
      .populate('employeeId', 'name email department position salary');

    res.status(200).json({
      status: 'success',
      data: updatedPayroll,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark payroll as paid
// @route   PUT /api/payroll/:id/pay
// @access  Private (Admin/CEO)
export const markAsPaid = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payroll = await Payroll.findById(req.params.id);

    if (!payroll) {
      return res.status(404).json({
        status: 'error',
        message: 'Payroll not found',
      });
    }

    if (payroll.status === 'paid') {
      return res.status(400).json({
        status: 'error',
        message: 'Payroll has already been marked as paid',
      });
    }

    payroll.status = 'paid';
    payroll.paidDate = new Date();
    await payroll.save();

    const updatedPayroll = await Payroll.findById(payroll._id)
      .populate('employeeId', 'name email department position salary');

    res.status(200).json({
      status: 'success',
      data: updatedPayroll,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete payroll
// @route   DELETE /api/payroll/:id
// @access  Private (Admin/CEO)
export const deletePayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payroll = await Payroll.findById(req.params.id);

    if (!payroll) {
      return res.status(404).json({
        status: 'error',
        message: 'Payroll not found',
      });
    }

    if (payroll.status === 'paid') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete paid payroll',
      });
    }

    await Payroll.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Payroll deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
