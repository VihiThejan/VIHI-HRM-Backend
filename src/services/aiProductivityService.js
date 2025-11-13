/**
 * AI Productivity Service
 * Calculates daily productivity scores using AI algorithms
 * VIHI IT Solutions - Stage 4
 */

const ActivityLog = require('../models/ActivityLog');
const ProductivitySummary = require('../models/ProductivitySummary');
const User = require('../models/User');

// ============================================
// CONSTANTS
// ============================================
const WEIGHTS = {
  TIME_RATIO: 70, // Active vs idle time (70% weight)
  ACTIVITY_EVENTS: 30, // Mouse/keyboard activity (30% weight)
};

const EXPECTED_VALUES = {
  MIN_WORK_HOURS: 6, // Minimum expected work hours
  MIN_EVENTS_PER_HOUR: 120, // Expected mouse+keyboard events per hour
  STANDARD_START_HOUR: 9, // Expected work start (9 AM)
  STANDARD_END_HOUR: 17, // Expected work end (5 PM)
};

// ============================================
// Calculate Daily Productivity Score
// ============================================
exports.calculateDailyScore = async (employeeId, date) => {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  // Fetch all activity logs for the day
  const logs = await ActivityLog.find({
    employeeId,
    timestamp: { $gte: startDate, $lte: endDate },
  }).sort({ timestamp: 1 });

  if (logs.length === 0) {
    // No data for the day
    return {
      score: 0,
      category: 'Inactive',
      activeTime: 0,
      idleTime: 0,
      totalTime: 0,
      totalMouseMoves: 0,
      totalKeyPresses: 0,
      totalActivityLogs: 0,
      timeRatioScore: 0,
      activityScore: 0,
      workHoursStart: null,
      workHoursEnd: null,
      peakProductivityHour: null,
    };
  }

  // Calculate time metrics
  const activeTime = logs.filter((log) => !log.idle).reduce((sum, log) => sum + log.duration, 0);
  const idleTime = logs.filter((log) => log.idle).reduce((sum, log) => sum + log.duration, 0);
  const totalTime = activeTime + idleTime;

  // Calculate activity metrics
  const totalMouseMoves = logs.reduce((sum, log) => sum + log.mouseMoves, 0);
  const totalKeyPresses = logs.reduce((sum, log) => sum + log.keyboardPresses, 0);
  const totalEvents = totalMouseMoves + totalKeyPresses;

  // Calculate work hours
  const firstLog = logs[0];
  const lastLog = logs[logs.length - 1];
  const workHoursStart = new Date(firstLog.timestamp).getHours();
  const workHoursEnd = new Date(lastLog.timestamp).getHours();

  // Find peak productivity hour
  const hourlyActivity = {};
  logs.forEach((log) => {
    const hour = new Date(log.timestamp).getHours();
    if (!hourlyActivity[hour]) {
      hourlyActivity[hour] = { events: 0, activeTime: 0 };
    }
    hourlyActivity[hour].events += log.mouseMoves + log.keyboardPresses;
    if (!log.idle) {
      hourlyActivity[hour].activeTime += log.duration;
    }
  });

  let peakHour = null;
  let maxActivity = 0;
  Object.keys(hourlyActivity).forEach((hour) => {
    const activity = hourlyActivity[hour].events + hourlyActivity[hour].activeTime / 10;
    if (activity > maxActivity) {
      maxActivity = activity;
      peakHour = parseInt(hour);
    }
  });

  // ============================================
  // SCORE CALCULATION
  // ============================================

  // 1. Time Ratio Score (70% weight)
  const timeRatio = totalTime > 0 ? activeTime / totalTime : 0;
  const timeRatioScore = Math.min(timeRatio * WEIGHTS.TIME_RATIO, WEIGHTS.TIME_RATIO);

  // 2. Activity Events Score (30% weight)
  const hoursWorked = totalTime / 3600;
  const expectedEvents = hoursWorked * EXPECTED_VALUES.MIN_EVENTS_PER_HOUR;
  const eventRatio = expectedEvents > 0 ? Math.min(totalEvents / expectedEvents, 1) : 0;
  const activityScore = eventRatio * WEIGHTS.ACTIVITY_EVENTS;

  // Total Score
  const score = Math.round(timeRatioScore + activityScore);
  const category = ProductivitySummary.getCategory(score);

  return {
    score,
    category,
    activeTime,
    idleTime,
    totalTime,
    totalMouseMoves,
    totalKeyPresses,
    totalActivityLogs: logs.length,
    timeRatioScore: Math.round(timeRatioScore),
    activityScore: Math.round(activityScore),
    workHoursStart,
    workHoursEnd,
    peakProductivityHour: peakHour,
  };
};

// ============================================
// Store Productivity Summary
// ============================================
exports.storeDailySummary = async (employeeId, date) => {
  const user = await User.findOne({ employeeId });
  if (!user) {
    throw new Error(`User with employeeId ${employeeId} not found`);
  }

  // Calculate score
  const scoreData = await this.calculateDailyScore(employeeId, date);

  // Check if summary already exists
  const existingSummary = await ProductivitySummary.findOne({
    employeeId,
    date: new Date(date),
  });

  if (existingSummary) {
    // Update existing
    Object.assign(existingSummary, scoreData);
    existingSummary.user = user._id;
    await existingSummary.save();
    return existingSummary;
  }

  // Create new summary
  const summary = await ProductivitySummary.create({
    user: user._id,
    employeeId,
    date: new Date(date),
    ...scoreData,
  });

  return summary;
};

// ============================================
// Get Employee Score for Date
// ============================================
exports.getEmployeeScore = async (employeeId, date) => {
  const summary = await ProductivitySummary.findOne({
    employeeId,
    date: new Date(date),
  }).populate('user', 'name email department position');

  if (!summary) {
    // Calculate on-the-fly if not stored
    const scoreData = await this.calculateDailyScore(employeeId, date);
    return {
      employeeId,
      date,
      ...scoreData,
      stored: false,
    };
  }

  return summary;
};

// ============================================
// Get Employee Score Trend (Last N Days)
// ============================================
exports.getScoreTrend = async (employeeId, days = 7) => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const summaries = await ProductivitySummary.find({
    employeeId,
    date: { $gte: startDate, $lte: endDate },
  })
    .sort({ date: 1 })
    .lean();

  // Fill in missing dates with zero scores
  const trend = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const summary = summaries.find(
      (s) => s.date.toISOString().split('T')[0] === dateStr
    );

    trend.push({
      date: dateStr,
      dateFormatted: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: summary?.score || 0,
      category: summary?.category || 'Inactive',
      activeHours: summary ? (summary.activeTime / 3600).toFixed(1) : 0,
      idleHours: summary ? (summary.idleTime / 3600).toFixed(1) : 0,
    });
  }

  return trend;
};

// ============================================
// Get Team Scores (Admin)
// ============================================
exports.getTeamScores = async (date, department = null) => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  // Get all active users
  const filter = { isActive: true };
  if (department) {
    filter.department = department;
  }
  const users = await User.find(filter).select('name email employeeId department position');

  // Get summaries for all users
  const summaries = await ProductivitySummary.find({
    date: targetDate,
  }).lean();

  const teamScores = users.map((user) => {
    const summary = summaries.find((s) => s.employeeId === user.employeeId);

    return {
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      department: user.department,
      position: user.position,
      score: summary?.score || 0,
      category: summary?.category || 'Inactive',
      activeHours: summary ? (summary.activeTime / 3600).toFixed(1) : 0,
      idleHours: summary ? (summary.idleTime / 3600).toFixed(1) : 0,
      totalLogs: summary?.totalActivityLogs || 0,
    };
  });

  // Sort by score descending
  teamScores.sort((a, b) => b.score - a.score);

  // Calculate team statistics
  const activeEmployees = teamScores.filter((e) => e.score > 0);
  const teamStats = {
    totalEmployees: teamScores.length,
    activeEmployees: activeEmployees.length,
    averageScore: activeEmployees.length > 0
      ? Math.round(activeEmployees.reduce((sum, e) => sum + e.score, 0) / activeEmployees.length)
      : 0,
    excellentCount: teamScores.filter((e) => e.category === 'Excellent').length,
    goodCount: teamScores.filter((e) => e.category === 'Good').length,
    needsImprovementCount: teamScores.filter((e) => e.category === 'Needs Improvement').length,
    inactiveCount: teamScores.filter((e) => e.category === 'Inactive').length,
  };

  return {
    date: targetDate,
    teamStats,
    employees: teamScores,
  };
};

// ============================================
// Recalculate All Scores for a Date (Admin)
// ============================================
exports.recalculateScoresForDate = async (date) => {
  const users = await User.find({ isActive: true }).select('employeeId');
  
  const results = {
    success: [],
    failed: [],
  };

  for (const user of users) {
    try {
      await this.storeDailySummary(user.employeeId, date);
      results.success.push(user.employeeId);
    } catch (error) {
      results.failed.push({
        employeeId: user.employeeId,
        error: error.message,
      });
    }
  }

  return results;
};

// ============================================
// Get Performance Distribution (Admin)
// ============================================
exports.getPerformanceDistribution = async (days = 30) => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const summaries = await ProductivitySummary.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        avgScore: { $avg: '$score' },
      },
    },
  ]);

  return summaries.map((s) => ({
    category: s._id,
    count: s.count,
    avgScore: Math.round(s.avgScore),
  }));
};
