/**
 * Activity Controller - Handle Time Tracking operations
 * VIHI IT Solutions HR System
 */

const Activity = require('../models/Activity');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');

// ============================================
// @desc    Create new activity record
// @route   POST /api/activity
// @access  Private (Python client or authenticated user)
// ============================================
exports.createActivity = asyncHandler(async (req, res) => {
  const {
    employeeId,
    date,
    activeTime,
    idleTime,
    applications,
    websites,
    deviceInfo,
  } = req.body;

  // Verify employee exists
  const user = await User.findOne({ employeeId });
  if (!user) {
    res.status(404);
    throw new Error('Employee not found');
  }

  // Check if activity for this date already exists
  const existingActivity = await Activity.findOne({
    user: user._id,
    date: new Date(date).setHours(0, 0, 0, 0),
  });

  if (existingActivity) {
    // Update existing activity
    existingActivity.activeTime += activeTime || 0;
    existingActivity.idleTime += idleTime || 0;
    existingActivity.totalTime = existingActivity.activeTime + existingActivity.idleTime;

    // Merge applications
    if (applications && applications.length > 0) {
      applications.forEach((newApp) => {
        const existingApp = existingActivity.applications.find(
          (app) => app.name === newApp.name
        );
        if (existingApp) {
          existingApp.duration += newApp.duration || 0;
        } else {
          existingActivity.applications.push(newApp);
        }
      });
    }

    // Merge websites
    if (websites && websites.length > 0) {
      websites.forEach((newWeb) => {
        const existingWeb = existingActivity.websites.find(
          (web) => web.url === newWeb.url
        );
        if (existingWeb) {
          existingWeb.duration += newWeb.duration || 0;
        } else {
          existingActivity.websites.push(newWeb);
        }
      });
    }

    existingActivity.calculateProductivity();
    await existingActivity.save();

    return res.status(200).json({
      success: true,
      message: 'Activity updated successfully',
      data: existingActivity,
    });
  }

  // Create new activity
  const activity = await Activity.create({
    user: user._id,
    employeeId,
    date: date || new Date(),
    activeTime: activeTime || 0,
    idleTime: idleTime || 0,
    applications: applications || [],
    websites: websites || [],
    deviceInfo: deviceInfo || {},
  });

  activity.calculateProductivity();
  await activity.save();

  res.status(201).json({
    success: true,
    message: 'Activity created successfully',
    data: activity,
  });
});

// ============================================
// @desc    Get activities for a user
// @route   GET /api/activity/user/:employeeId
// @access  Private
// ============================================
exports.getUserActivities = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { startDate, endDate, limit = 30 } = req.query;

  // Build filter
  const filter = { employeeId };

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const activities = await Activity.find(filter)
    .populate('user', 'name email employeeId department')
    .sort({ date: -1 })
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    count: activities.length,
    data: activities,
  });
});

// ============================================
// @desc    Get all activities (Admin only)
// @route   GET /api/activity
// @access  Private (Admin)
// ============================================
exports.getAllActivities = asyncHandler(async (req, res) => {
  const { startDate, endDate, department, limit = 50 } = req.query;

  // Build filter
  const filter = {};

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  let query = Activity.find(filter)
    .populate('user', 'name email employeeId department position')
    .sort({ date: -1 })
    .limit(parseInt(limit));

  // Filter by department if specified
  if (department) {
    const users = await User.find({ department }).select('_id');
    const userIds = users.map((u) => u._id);
    filter.user = { $in: userIds };
  }

  const activities = await query;

  res.status(200).json({
    success: true,
    count: activities.length,
    data: activities,
  });
});

// ============================================
// @desc    Get activity statistics
// @route   GET /api/activity/stats/:employeeId
// @access  Private
// ============================================
exports.getActivityStats = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { startDate, endDate } = req.query;

  const filter = { employeeId };

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const activities = await Activity.find(filter);

  if (activities.length === 0) {
    return res.status(200).json({
      success: true,
      message: 'No activity data found',
      data: {
        totalActiveTime: 0,
        totalIdleTime: 0,
        averageProductivity: 0,
        totalDays: 0,
      },
    });
  }

  // Calculate statistics
  const stats = {
    totalActiveTime: activities.reduce((sum, act) => sum + act.activeTime, 0),
    totalIdleTime: activities.reduce((sum, act) => sum + act.idleTime, 0),
    totalTime: activities.reduce((sum, act) => sum + act.totalTime, 0),
    averageProductivity: Math.round(
      activities.reduce((sum, act) => sum + act.productivity.score, 0) / activities.length
    ),
    totalDays: activities.length,
    mostUsedApps: [],
    mostVisitedWebsites: [],
  };

  // Get top applications
  const appMap = new Map();
  activities.forEach((act) => {
    act.applications.forEach((app) => {
      const current = appMap.get(app.name) || 0;
      appMap.set(app.name, current + app.duration);
    });
  });

  stats.mostUsedApps = Array.from(appMap.entries())
    .map(([name, duration]) => ({ name, duration }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5);

  // Get top websites
  const webMap = new Map();
  activities.forEach((act) => {
    act.websites.forEach((web) => {
      const current = webMap.get(web.domain || web.url) || 0;
      webMap.set(web.domain || web.url, current + web.duration);
    });
  });

  stats.mostVisitedWebsites = Array.from(webMap.entries())
    .map(([domain, duration]) => ({ domain, duration }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5);

  res.status(200).json({
    success: true,
    data: stats,
  });
});

// ============================================
// @desc    Delete activity record
// @route   DELETE /api/activity/:id
// @access  Private (Admin only)
// ============================================
exports.deleteActivity = asyncHandler(async (req, res) => {
  const activity = await Activity.findById(req.params.id);

  if (!activity) {
    res.status(404);
    throw new Error('Activity not found');
  }

  await activity.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Activity deleted successfully',
  });
});
