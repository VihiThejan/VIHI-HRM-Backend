import { Router } from 'express';
import { 
  getDashboardStats,
  getRecentActivity,
  getUpcomingBirthdays,
  getUpcomingReviews,
  getOnLeaveToday,
  getTopPerformers,
  getDepartmentStats,
  getTimeTrackingSummary,
  getComplianceAlerts
} from '../controllers/dashboard.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// All dashboard routes require authentication
router.use(protect);

// Dashboard statistics
router.get('/stats', getDashboardStats);

// Recent activity
router.get('/activity', getRecentActivity);

// Upcoming birthdays (next 7 days)
router.get('/birthdays', getUpcomingBirthdays);

// Upcoming performance reviews (next 30 days)
router.get('/upcoming-reviews', getUpcomingReviews);

// Employees on leave today
router.get('/on-leave-today', getOnLeaveToday);

// Top performers this month
router.get('/top-performers', getTopPerformers);

// Department-wise statistics
router.get('/department-stats', getDepartmentStats);

// Time tracking summary
router.get('/time-tracking-summary', getTimeTrackingSummary);

// Compliance alerts
router.get('/compliance-alerts', getComplianceAlerts);

export default router;
