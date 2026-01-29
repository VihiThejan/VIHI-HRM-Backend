import { Response, NextFunction } from 'express';
import Leave from '../models/Leave.model';
import Employee from '../models/Employee.model';
import { AuthRequest } from '../middleware/auth.middleware';

// @desc    Get all leaves
// @route   GET /api/leaves
// @access  Private
export const getLeaves = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const type = req.query.type as string;

    const query: any = {};

    // Regular employees/interns can only see their own leaves
    if (req.user.role === 'employee' || req.user.role === 'intern') {
      // Always cast to ObjectId for correct matching
      const mongoose = require('mongoose');
      query.employeeId = new mongoose.Types.ObjectId(req.user.id);
    }

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    const total = await Leave.countDocuments(query);
    const leaves = await Leave.find(query)
      .populate('employeeId', 'name email department position')
      .populate('approvedBy', 'name email')
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: leaves,
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

// @desc    Get single leave
// @route   GET /api/leaves/:id
// @access  Private
export const getLeave = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate('employeeId', 'name email department position')
      .populate('approvedBy', 'name email');

    if (!leave) {
      return res.status(404).json({
        status: 'error',
        message: 'Leave not found',
      });
    }

    // Check if user has access to this leave
    if (
      req.user.role === 'employee' &&
      leave.employeeId._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to access this leave',
      });
    }

    res.status(200).json({
      status: 'success',
      data: leave,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request leave
// @route   POST /api/leaves
// @access  Private
export const createLeave = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { type, startDate, endDate, reason } = req.body;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return res.status(400).json({
        status: 'error',
        message: 'End date must be after start date',
      });
    }

    // Check for overlapping leaves
    const overlapping = await Leave.findOne({
      employeeId: req.user.id,
      status: { $ne: 'rejected' },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
    });

    if (overlapping) {
      return res.status(400).json({
        status: 'error',
        message: 'You already have a leave request for this period',
      });
    }

    const leave = await Leave.create({
      employeeId: req.user.id,
      type,
      startDate: start,
      endDate: end,
      reason,
    });

    const populatedLeave = await Leave.findById(leave._id)
      .populate('employeeId', 'name email department position');

    res.status(201).json({
      status: 'success',
      data: populatedLeave,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update leave
// @route   PUT /api/leaves/:id
// @access  Private
export const updateLeave = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        status: 'error',
        message: 'Leave not found',
      });
    }

    // Only the employee who created the leave can update it and only if it's pending
    if (leave.employeeId.toString() !== req.user.id || leave.status !== 'pending') {
      return res.status(403).json({
        status: 'error',
        message: 'Cannot update this leave',
      });
    }

    const { type, startDate, endDate, reason } = req.body;

    leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { type, startDate, endDate, reason },
      { new: true, runValidators: true }
    ).populate('employeeId', 'name email department position');

    res.status(200).json({
      status: 'success',
      data: leave,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve leave
// @route   PUT /api/leaves/:id/approve
// @access  Private (Manager/Admin/CEO)
export const approveLeave = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        status: 'error',
        message: 'Leave not found',
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Leave has already been processed',
      });
    }

    leave.status = 'approved';
    leave.approvedBy = req.user.id;
    leave.approvedDate = new Date();
    await leave.save();

    const updatedLeave = await Leave.findById(leave._id)
      .populate('employeeId', 'name email department position')
      .populate('approvedBy', 'name email');

    res.status(200).json({
      status: 'success',
      data: updatedLeave,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject leave
// @route   PUT /api/leaves/:id/reject
// @access  Private (Manager/Admin/CEO)
export const rejectLeave = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        status: 'error',
        message: 'Rejection reason is required',
      });
    }

    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        status: 'error',
        message: 'Leave not found',
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Leave has already been processed',
      });
    }

    leave.status = 'rejected';
    leave.approvedBy = req.user.id;
    leave.approvedDate = new Date();
    leave.rejectionReason = rejectionReason;
    await leave.save();

    const updatedLeave = await Leave.findById(leave._id)
      .populate('employeeId', 'name email department position')
      .populate('approvedBy', 'name email');

    res.status(200).json({
      status: 'success',
      data: updatedLeave,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete leave
// @route   DELETE /api/leaves/:id
// @access  Private
export const deleteLeave = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        status: 'error',
        message: 'Leave not found',
      });
    }

    // Only the employee who created the leave can delete it and only if it's pending
    if (leave.employeeId.toString() !== req.user.id || leave.status !== 'pending') {
      return res.status(403).json({
        status: 'error',
        message: 'Cannot delete this leave',
      });
    }

    await Leave.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Leave deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get leave balance
// @route   GET /api/leaves/balance
// @access  Private
export const getLeaveBalance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const employeeId = req.query.employeeId || req.user.id;

    // Check authorization
    if (
      req.user.role === 'employee' &&
      employeeId !== req.user.id
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to view this balance',
      });
    }

    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    // Count approved leaves by type for current year
    const leaves = await Leave.find({
      employeeId,
      status: 'approved',
      startDate: { $gte: yearStart, $lte: yearEnd },
    });

    const balance = {
      sick: { used: 0, total: 10 },
      casual: { used: 0, total: 7 },
      annual: { used: 0, total: 14 },
      unpaid: { used: 0, total: 0 },
    };

    leaves.forEach((leave) => {
      const days = Math.ceil(
        (leave.endDate.getTime() - leave.startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
      
      if (balance[leave.type]) {
        balance[leave.type].used += days;
      }
    });

    res.status(200).json({
      status: 'success',
      data: balance,
    });
  } catch (error) {
    next(error);
  }
};
