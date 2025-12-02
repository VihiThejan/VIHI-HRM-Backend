import { Response, NextFunction } from 'express';
import Performance from '../models/Performance.model';
import { AuthRequest } from '../middleware/auth.middleware';

// @desc    Get performance reviews
// @route   GET /api/performance
// @access  Private
export const getPerformanceReviews = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const employeeId = req.query.employeeId as string;
    const period = req.query.period as string;

    const query: any = {};

    // Regular employees can only see their own reviews
    if (req.user.role === 'employee' || req.user.role === 'intern') {
      query.employeeId = req.user.id;
    } else if (employeeId) {
      query.employeeId = employeeId;
    }

    if (period) {
      query.period = period;
    }

    const total = await Performance.countDocuments(query);
    const reviews = await Performance.find(query)
      .populate('employeeId', 'name email department position')
      .populate('reviewerId', 'name email position')
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: reviews,
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

// @desc    Get employee performance reviews
// @route   GET /api/performance/employee/:employeeId
// @access  Private
export const getEmployeePerformance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employeeId } = req.params;

    // Check authorization
    if (
      (req.user.role === 'employee' || req.user.role === 'intern') &&
      employeeId !== req.user.id
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to access these reviews',
      });
    }

    const reviews = await Performance.find({ employeeId })
      .populate('employeeId', 'name email department position')
      .populate('reviewerId', 'name email position')
      .sort({ createdAt: -1 });

    // Calculate average rating
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    res.status(200).json({
      status: 'success',
      data: {
        reviews,
        averageRating: Math.round(averageRating * 100) / 100,
        totalReviews: reviews.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single performance review
// @route   GET /api/performance/:id
// @access  Private
export const getPerformanceReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const review = await Performance.findById(req.params.id)
      .populate('employeeId', 'name email department position')
      .populate('reviewerId', 'name email position');

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Performance review not found',
      });
    }

    // Check authorization
    if (
      (req.user.role === 'employee' || req.user.role === 'intern') &&
      review.employeeId._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to access this review',
      });
    }

    res.status(200).json({
      status: 'success',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create performance review
// @route   POST /api/performance
// @access  Private (Manager/Admin/CEO)
export const createPerformanceReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employeeId, period, goals, achievements, rating, comments, strengths, improvements } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        status: 'error',
        message: 'Employee ID is required',
      });
    }

    // Check if review already exists for this period
    const existingReview = await Performance.findOne({ employeeId, period });
    if (existingReview) {
      return res.status(400).json({
        status: 'error',
        message: 'Review already exists for this period',
      });
    }

    const review = await Performance.create({
      employeeId,
      reviewerId: req.user.id,
      period,
      goals: goals || [],
      achievements: achievements || [],
      rating,
      comments,
      strengths: strengths || [],
      improvements: improvements || [],
    });

    const populatedReview = await Performance.findById(review._id)
      .populate('employeeId', 'name email department position')
      .populate('reviewerId', 'name email position');

    res.status(201).json({
      status: 'success',
      data: populatedReview,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update performance review
// @route   PUT /api/performance/:id
// @access  Private (Manager/Admin/CEO)
export const updatePerformanceReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { period, goals, achievements, rating, comments, strengths, improvements } = req.body;

    let review = await Performance.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Performance review not found',
      });
    }

    // Only the reviewer can update
    if (review.reviewerId.toString() !== req.user.id && !['admin', 'ceo'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this review',
      });
    }

    review = await Performance.findByIdAndUpdate(
      req.params.id,
      { period, goals, achievements, rating, comments, strengths, improvements },
      { new: true, runValidators: true }
    )
      .populate('employeeId', 'name email department position')
      .populate('reviewerId', 'name email position');

    res.status(200).json({
      status: 'success',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete performance review
// @route   DELETE /api/performance/:id
// @access  Private (Admin/CEO)
export const deletePerformanceReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const review = await Performance.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Performance review not found',
      });
    }

    await Performance.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Performance review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
