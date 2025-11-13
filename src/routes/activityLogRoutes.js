/**
 * ActivityLog Routes
 * VIHI IT Solutions HR System
 */

const express = require('express');
const router = express.Router();
const {
  createActivityLog,
  getActivityLogs,
  getActivityLogSummary,
  getRecentLogs,
  cleanupOldLogs,
  getAllActivityLogs,
} = require('../controllers/activityLogController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateApiKey } = require('../middleware/apiKeyMiddleware');

// Python client route (accepts either JWT or API key)
router.post('/log', validateApiKey, createActivityLog);

// Protected employee routes
router.get('/log/:employeeId', protect, getActivityLogs);
router.get('/log/summary/:employeeId', protect, getActivityLogSummary);
router.get('/log/recent/:employeeId', protect, getRecentLogs);

// Admin routes
router.get('/log/all', protect, authorize('admin', 'manager'), getAllActivityLogs);
router.delete('/log/cleanup', protect, authorize('admin'), cleanupOldLogs);

module.exports = router;
