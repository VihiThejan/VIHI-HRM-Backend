import { Response, NextFunction } from 'express';
import Attendance from '../models/Attendance.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { startOfDay, endOfDay } from 'date-fns';

// @desc    Check in
// @route   POST /api/attendance/check-in
// @access  Private
export const checkIn = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      employeeId: req.user.id,
      date: { $gte: startOfToday, $lte: endOfToday },
    });

    if (existingAttendance) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already checked in today',
      });
    }

    const checkInTime = new Date();
    const workStartTime = new Date(today.setHours(9, 0, 0, 0)); // 9 AM
    const isLate = checkInTime > workStartTime;

    const attendance = await Attendance.create({
      employeeId: req.user.id,
      date: today,
      checkIn: checkInTime,
      status: isLate ? 'late' : 'present',
    });

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('employeeId', 'name email department position');

    res.status(201).json({
      status: 'success',
      data: populatedAttendance,
      message: isLate ? 'Checked in late' : 'Checked in successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check out
// @route   POST /api/attendance/check-out
// @access  Private
export const checkOut = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    const attendance = await Attendance.findOne({
      employeeId: req.user.id,
      date: { $gte: startOfToday, $lte: endOfToday },
    });

    if (!attendance) {
      return res.status(400).json({
        status: 'error',
        message: 'You need to check in first',
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already checked out today',
      });
    }

    attendance.checkOut = new Date();
    
    // Calculate total hours (pre-save hook will handle this)
    await attendance.save();

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('employeeId', 'name email department position');

    res.status(200).json({
      status: 'success',
      data: populatedAttendance,
      message: 'Checked out successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance records
// @route   GET /api/attendance
// @access  Private
export const getAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const employeeId = req.query.employeeId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const status = req.query.status as string;

    const query: any = {};

    // Regular employees can only see their own attendance
    if (req.user.role === 'employee' || req.user.role === 'intern') {
      query.employeeId = req.user.id;
    } else if (employeeId) {
      query.employeeId = employeeId;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (status) {
      query.status = status;
    }

    const total = await Attendance.countDocuments(query);
    const attendanceRecords = await Attendance.find(query)
      .populate('employeeId', 'name email department position')
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ date: -1 });

    res.status(200).json({
      status: 'success',
      data: attendanceRecords,
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

// @desc    Get single attendance record
// @route   GET /api/attendance/:id
// @access  Private
export const getAttendanceById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('employeeId', 'name email department position');

    if (!attendance) {
      return res.status(404).json({
        status: 'error',
        message: 'Attendance record not found',
      });
    }

    // Check authorization
    if (
      (req.user.role === 'employee' || req.user.role === 'intern') &&
      attendance.employeeId._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to access this record',
      });
    }

    res.status(200).json({
      status: 'success',
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update attendance (for corrections)
// @route   PUT /api/attendance/:id
// @access  Private (Admin/Manager)
export const updateAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { checkIn, checkOut, status, notes } = req.body;

    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { checkIn, checkOut, status, notes },
      { new: true, runValidators: true }
    ).populate('employeeId', 'name email department position');

    if (!attendance) {
      return res.status(404).json({
        status: 'error',
        message: 'Attendance record not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark absence
// @route   POST /api/attendance/mark-absent
// @access  Private (Admin/Manager)
export const markAbsent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employeeId, date, notes } = req.body;

    if (!employeeId || !date) {
      return res.status(400).json({
        status: 'error',
        message: 'Employee ID and date are required',
      });
    }

    const attendanceDate = new Date(date);
    const startOfDate = startOfDay(attendanceDate);
    const endOfDate = endOfDay(attendanceDate);

    // Check if record already exists
    const existing = await Attendance.findOne({
      employeeId,
      date: { $gte: startOfDate, $lte: endOfDate },
    });

    if (existing) {
      return res.status(400).json({
        status: 'error',
        message: 'Attendance record already exists for this date',
      });
    }

    const attendance = await Attendance.create({
      employeeId,
      date: attendanceDate,
      checkIn: startOfDate,
      status: 'absent',
      notes,
    });

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('employeeId', 'name email department position');

    res.status(201).json({
      status: 'success',
      data: populatedAttendance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance summary
// @route   GET /api/attendance/summary
// @access  Private
export const getAttendanceSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const employeeId = req.query.employeeId as string || req.user.id;
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    // Check authorization
    if (
      (req.user.role === 'employee' || req.user.role === 'intern') &&
      employeeId !== req.user.id
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to view this summary',
      });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const records = await Attendance.find({
      employeeId,
      date: { $gte: startDate, $lte: endDate },
    });

    const summary = {
      totalDays: records.length,
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.status === 'late').length,
      halfDay: records.filter(r => r.status === 'half-day').length,
      totalHours: records.reduce((sum, r) => sum + (r.totalHours || 0), 0),
      averageHours: 0,
    };

    summary.averageHours = summary.totalDays > 0 
      ? Math.round((summary.totalHours / summary.totalDays) * 100) / 100 
      : 0;

    res.status(200).json({
      status: 'success',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};
