import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Middleware to handle validation errors
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.type === 'field' ? (err as any).path : undefined,
        message: err.msg,
      })),
    });
  }
  next();
};

export const validateEmployee = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('department').notEmpty().withMessage('Department is required'),
  body('position').notEmpty().withMessage('Position is required'),
  body('salary').isNumeric().withMessage('Salary must be a number'),
];

export const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const validateLeave = [
  body('type').isIn(['sick', 'casual', 'annual', 'unpaid']).withMessage('Invalid leave type'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('reason').trim().notEmpty().withMessage('Reason is required'),
];

export const validateAttendance = [
  body('checkIn').isISO8601().withMessage('Valid check-in time is required'),
];

export const validatePayroll = [
  body('month').notEmpty().withMessage('Month is required'),
  body('year').isNumeric().withMessage('Year must be a number'),
];

export const validatePerformance = [
  body('period').notEmpty().withMessage('Period is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comments').notEmpty().withMessage('Comments are required'),
];

export const validateJobPosting = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('department').notEmpty().withMessage('Department is required'),
  body('location').notEmpty().withMessage('Location is required'),
];

export const validateInternTask = [
  body('description').trim().notEmpty().withMessage('Task description is required'),
  body('hours').isFloat({ min: 0, max: 24 }).withMessage('Hours must be between 0 and 24'),
];

export const validateId = [
  param('id').isMongoId().withMessage('Invalid ID format'),
];

export const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];
