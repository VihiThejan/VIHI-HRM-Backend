/**
 * ActivityLog Controller - Handle granular activity logging
 * VIHI IT Solutions HR System
 */

const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');

// ============================================
// @desc    Create new activity log entry
// @route   POST /api/activity/log
// @access  Private (Python client with JWT or API key)
// ============================================
exports.createActivityLog = asyncHandler(async (req, res) => {
  const {
    employeeId,
    activeWindow,
    mouseMoves,
    keyboardPresses,
    idle,
    duration,
    deviceInfo,
  } = req.body;

  // Validate required fields
  if (!employeeId || !activeWindow) {
    res.status(400);
    throw new Error('Employee ID and active window are required');
  }

  // Verify employee exists
  const user = await User.findOne({ employeeId });
  if (!user) {
    res.status(404);
    throw new Error('Employee not found');
  }

  // Create activity log entry
  const activityLog = await ActivityLog.create({
    user: user._id,
    employeeId,
    timestamp: new Date(),
    activeWindow,
    mouseMoves: mouseMoves || 0,
    keyboardPresses: keyboardPresses || 0,
    idle: idle || false,
    duration: duration || 60,
    deviceInfo: deviceInfo || {},
  });

  // Emit Socket.io event for real-time updates
  if (req.app.locals.io) {
    req.app.locals.io.emit('activity_update', {
      employeeId,
      timestamp: activityLog.timestamp,
      activeWindow,
      idle: idle || false,
      mouseMoves: mouseMoves || 0,
      keyboardPresses: keyboardPresses || 0,
    });
  }

  res.status(201).json({
    success: true,
    message: 'Activity log created successfully',
    data: activityLog,
  });
});

// ============================================
// @desc    Get activity logs for specific employee
// @route   GET /api/activity/log/:employeeId
// @access  Private
// ============================================
exports.getActivityLogs = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { startDate, endDate, limit = 100, page = 1 } = req.query;

  // Build filter
  const filter = { employeeId };

  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const logs = await ActivityLog.find(filter)
    .populate('user', 'name email employeeId department')
    .sort({ timestamp: -1 })
    .limit(parseInt(limit))
    .skip(skip);

  const total = await ActivityLog.countDocuments(filter);

  res.status(200).json({
    success: true,
    count: logs.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: logs,
  });
});

// ============================================
// @desc    Get activity log summary
// @route   GET /api/activity/log/summary/:employeeId
// @access  Private
// ============================================
exports.getActivityLogSummary = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
  const end = endDate ? new Date(endDate) : new Date();

  const summary = await ActivityLog.getSummary(employeeId, start, end);

  res.status(200).json({
    success: true,
    data: summary,
  });
});

// ============================================
// @desc    Get recent activity logs (for live dashboard)
// @route   GET /api/activity/log/recent/:employeeId
// @access  Private
// ============================================
exports.getRecentLogs = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { minutes = 5 } = req.query;

  const timeAgo = new Date(Date.now() - parseInt(minutes) * 60 * 1000);

  const logs = await ActivityLog.find({
    employeeId,
    timestamp: { $gte: timeAgo },
  })
    .sort({ timestamp: -1 })
    .limit(50);

  res.status(200).json({
    success: true,
    count: logs.length,
    data: logs,
  });
});

// ============================================
// @desc    Delete old activity logs (cleanup)
// @route   DELETE /api/activity/log/cleanup
// @access  Private (Admin only)
// ============================================
exports.cleanupOldLogs = asyncHandler(async (req, res) => {
  const { days = 90 } = req.query;

  const cutoffDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

  const result = await ActivityLog.deleteMany({
    timestamp: { $lt: cutoffDate },
  });

  res.status(200).json({
    success: true,
    message: `Deleted ${result.deletedCount} old activity logs`,
    deletedCount: result.deletedCount,
  });
});

// ============================================
// @desc    Get all employee activity logs (Admin)
// @route   GET /api/activity/log/all
// @access  Private (Admin only)
// ============================================
exports.getAllActivityLogs = asyncHandler(async (req, res) => {
  const { startDate, endDate, department, limit = 100, page = 1 } = req.query;

  const filter = {};

  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  // Filter by department if specified
  if (department) {
    const users = await User.find({ department }).select('_id');
    const userIds = users.map((u) => u._id);
    filter.user = { $in: userIds };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const logs = await ActivityLog.find(filter)
    .populate('user', 'name email employeeId department position')
    .sort({ timestamp: -1 })
    .limit(parseInt(limit))
    .skip(skip);

  const total = await ActivityLog.countDocuments(filter);

  res.status(200).json({
    success: true,
    count: logs.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: logs,
  });
});
