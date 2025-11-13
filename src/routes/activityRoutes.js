/**
 * Activity Routes
 * VIHI IT Solutions HR System
 */

const express = require('express');
const router = express.Router();
const {
  createActivity,
  getUserActivities,
  getAllActivities,
  getActivityStats,
  deleteActivity,
} = require('../controllers/activityController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Protected routes
router.post('/', protect, createActivity);
router.get('/', protect, authorize('admin', 'manager'), getAllActivities);
router.get('/user/:employeeId', protect, getUserActivities);
router.get('/stats/:employeeId', protect, getActivityStats);
router.delete('/:id', protect, authorize('admin'), deleteActivity);

module.exports = router;
