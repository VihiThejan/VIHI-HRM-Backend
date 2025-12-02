import { Response, NextFunction } from 'express';
import InternTimeTracking from '../models/InternTimeTracking.model';
import Employee from '../models/Employee.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { startOfWeek, endOfWeek } from 'date-fns';
import { generateInternDiary } from '../utils/pdfGenerator';
import path from 'path';

// @desc    Add/Log task for intern
// @route   POST /api/interns/track
// @access  Private (Interns)
export const logTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { date, description, hours } = req.body;

    if (!date || !description || hours === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Date, description, and hours are required',
      });
    }

    // Check if user is intern
    if (req.user.role !== 'intern') {
      return res.status(403).json({
        status: 'error',
        message: 'Only interns can log tasks',
      });
    }

    const taskDate = new Date(date);
    const weekStart = startOfWeek(taskDate, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(taskDate, { weekStartsOn: 1 }); // Sunday

    // Find or create tracking for this week
    let tracking = await InternTimeTracking.findOne({
      internId: req.user.id,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
    });

    if (!tracking) {
      tracking = await InternTimeTracking.create({
        internId: req.user.id,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        tasks: [],
        totalHours: 0,
      });
    }

    // Add task
    tracking.tasks.push({ date: taskDate, description, hours });
    await tracking.save();

    const populatedTracking = await InternTimeTracking.findById(tracking._id)
      .populate('internId', 'name email');

    res.status(201).json({
      status: 'success',
      data: populatedTracking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get weekly summary for intern
// @route   GET /api/interns/weekly
// @access  Private
export const getWeeklySummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const internId = req.query.internId as string || req.user.id;
    const weekStartDate = req.query.weekStartDate as string;

    // Check authorization
    if (req.user.role === 'intern' && internId !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to view this summary',
      });
    }

    const query: any = { internId };

    if (weekStartDate) {
      const start = new Date(weekStartDate);
      const end = endOfWeek(start, { weekStartsOn: 1 });
      query.weekStartDate = start;
      query.weekEndDate = end;
    }

    const summaries = await InternTimeTracking.find(query)
      .populate('internId', 'name email department')
      .sort({ weekStartDate: -1 })
      .limit(10);

    res.status(200).json({
      status: 'success',
      data: summaries,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single tracking record
// @route   GET /api/interns/:id
// @access  Private
export const getTracking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tracking = await InternTimeTracking.findById(req.params.id)
      .populate('internId', 'name email department');

    if (!tracking) {
      return res.status(404).json({
        status: 'error',
        message: 'Tracking record not found',
      });
    }

    // Check authorization
    if (
      req.user.role === 'intern' &&
      tracking.internId._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to view this record',
      });
    }

    res.status(200).json({
      status: 'success',
      data: tracking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update tracking (edit tasks, mark as submitted)
// @route   PUT /api/interns/:id
// @access  Private (Interns)
export const updateTracking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tasks, status } = req.body;

    let tracking = await InternTimeTracking.findById(req.params.id);

    if (!tracking) {
      return res.status(404).json({
        status: 'error',
        message: 'Tracking record not found',
      });
    }

    // Check authorization
    if (tracking.internId.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this record',
      });
    }

    // Can't edit if already completed or submitted
    if (tracking.status === 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot edit completed tracking',
      });
    }

    if (tasks) {
      tracking.tasks = tasks;
    }

    if (status) {
      tracking.status = status;
    }

    await tracking.save();

    const updatedTracking = await InternTimeTracking.findById(tracking._id)
      .populate('internId', 'name email department');

    res.status(200).json({
      status: 'success',
      data: updatedTracking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add CEO comments to tracking
// @route   POST /api/interns/:id/comments
// @access  Private (CEO only)
export const addCeoComments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { comments } = req.body;

    if (!comments) {
      return res.status(400).json({
        status: 'error',
        message: 'Comments are required',
      });
    }

    const tracking = await InternTimeTracking.findById(req.params.id);

    if (!tracking) {
      return res.status(404).json({
        status: 'error',
        message: 'Tracking record not found',
      });
    }

    tracking.ceoComments = comments;
    tracking.status = 'completed';
    await tracking.save();

    const updatedTracking = await InternTimeTracking.findById(tracking._id)
      .populate('internId', 'name email department');

    res.status(200).json({
      status: 'success',
      data: updatedTracking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate and download weekly diary PDF
// @route   GET /api/interns/:id/diary
// @access  Private
export const downloadDiary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tracking = await InternTimeTracking.findById(req.params.id)
      .populate('internId', 'name email');

    if (!tracking) {
      return res.status(404).json({
        status: 'error',
        message: 'Tracking record not found',
      });
    }

    // Check authorization
    if (
      req.user.role === 'intern' &&
      tracking.internId._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to download this diary',
      });
    }

    // Generate PDF if not already generated
    if (!tracking.diaryGenerated || !tracking.diaryUrl) {
      const outputPath = path.join(process.cwd(), 'uploads', 'diaries');
      const internName = (tracking.internId as any).name;
      
      try {
        const pdfPath = await generateInternDiary(tracking, internName, outputPath);
        tracking.diaryGenerated = true;
        tracking.diaryUrl = `/uploads/diaries/${path.basename(pdfPath)}`;
        await tracking.save();
      } catch (pdfError) {
        return res.status(500).json({
          status: 'error',
          message: 'Failed to generate PDF diary',
        });
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        diaryUrl: tracking.diaryUrl,
        message: 'Diary generated successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit weekly tracking
// @route   POST /api/interns/:id/submit
// @access  Private (Interns)
export const submitTracking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tracking = await InternTimeTracking.findById(req.params.id);

    if (!tracking) {
      return res.status(404).json({
        status: 'error',
        message: 'Tracking record not found',
      });
    }

    // Check authorization
    if (tracking.internId.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to submit this tracking',
      });
    }

    if (tracking.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'Tracking has already been submitted',
      });
    }

    tracking.status = 'submitted';
    await tracking.save();

    const updatedTracking = await InternTimeTracking.findById(tracking._id)
      .populate('internId', 'name email department');

    res.status(200).json({
      status: 'success',
      data: updatedTracking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all intern tracking records (for managers/admin)
// @route   GET /api/interns
// @access  Private (Manager/Admin/CEO)
export const getAllTracking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const internId = req.query.internId as string;

    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (internId) {
      query.internId = internId;
    }

    const total = await InternTimeTracking.countDocuments(query);
    const trackings = await InternTimeTracking.find(query)
      .populate('internId', 'name email department')
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ weekStartDate: -1 });

    res.status(200).json({
      status: 'success',
      data: trackings,
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
