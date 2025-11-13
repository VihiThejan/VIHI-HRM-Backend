/**
 * Analytics Service - Data Aggregation & Analytics
 * Processes ActivityLog data for reporting and visualization
 * VIHI IT Solutions HR System
 */

const ActivityLog = require('../models/ActivityLog');
const Activity = require('../models/Activity');
const User = require('../models/User');

// ============================================
// HELPER: Format seconds to hours
// ============================================
const secondsToHours = (seconds) => {
  return (seconds / 3600).toFixed(2);
};

// ============================================
// Get Summary Analytics for Employee
// ============================================
exports.getEmployeeSummary = async (employeeId, startDate, endDate) => {
  const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
  const end = endDate ? new Date(endDate) : new Date(new Date().setHours(23, 59, 59, 999));

  // Fetch activity logs
  const logs = await ActivityLog.find({
    employeeId,
    timestamp: { $gte: start, $lte: end },
  }).sort({ timestamp: 1 });

  if (logs.length === 0) {
    return {
      employeeId,
      date: start.toISOString().split('T')[0],
      totalActiveTime: 0,
      totalIdleTime: 0,
      totalTime: 0,
      productivityScore: 0,
      totalLogs: 0,
      averageMouseMoves: 0,
      averageKeyPresses: 0,
      topApplications: [],
      categoryBreakdown: {
        productive: 0,
        neutral: 0,
        unproductive: 0,
      },
    };
  }

  // Calculate totals
  const totalActiveTime = logs.filter((log) => !log.idle).reduce((sum, log) => sum + log.duration, 0);
  const totalIdleTime = logs.filter((log) => log.idle).reduce((sum, log) => sum + log.duration, 0);
  const totalTime = totalActiveTime + totalIdleTime;

  // Calculate productivity score
  const productivityScore = totalTime > 0 ? Math.round((totalActiveTime / totalTime) * 100) : 0;

  // Calculate averages
  const totalMouseMoves = logs.reduce((sum, log) => sum + log.mouseMoves, 0);
  const totalKeyPresses = logs.reduce((sum, log) => sum + log.keyboardPresses, 0);

  // Get top applications
  const appMap = new Map();
  logs.forEach((log) => {
    const appName = log.activeWindow.split('-')[0].trim();
    const current = appMap.get(appName) || { duration: 0, count: 0, category: log.windowCategory };
    appMap.set(appName, {
      duration: current.duration + log.duration,
      count: current.count + 1,
      category: log.windowCategory,
    });
  });

  const topApplications = Array.from(appMap.entries())
    .map(([name, data]) => ({
      name,
      duration: data.duration,
      durationHours: secondsToHours(data.duration),
      count: data.count,
      category: data.category,
    }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10);

  // Category breakdown
  const categoryBreakdown = {
    productive: logs.filter((log) => log.windowCategory === 'productive').reduce((sum, log) => sum + log.duration, 0),
    neutral: logs.filter((log) => log.windowCategory === 'neutral').reduce((sum, log) => sum + log.duration, 0),
    unproductive: logs.filter((log) => log.windowCategory === 'unproductive').reduce((sum, log) => sum + log.duration, 0),
  };

  return {
    employeeId,
    date: start.toISOString().split('T')[0],
    totalActiveTime,
    totalActiveTimeHours: secondsToHours(totalActiveTime),
    totalIdleTime,
    totalIdleTimeHours: secondsToHours(totalIdleTime),
    totalTime,
    totalTimeHours: secondsToHours(totalTime),
    productivityScore,
    totalLogs: logs.length,
    averageMouseMoves: Math.round(totalMouseMoves / logs.length),
    averageKeyPresses: Math.round(totalKeyPresses / logs.length),
    topApplications,
    categoryBreakdown: {
      productive: secondsToHours(categoryBreakdown.productive),
      neutral: secondsToHours(categoryBreakdown.neutral),
      unproductive: secondsToHours(categoryBreakdown.unproductive),
    },
  };
};

// ============================================
// Get 7-Day Productivity Trend
// ============================================
exports.getProductivityTrend = async (employeeId, days = 7) => {
  const trends = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const summary = await this.getEmployeeSummary(
      employeeId,
      date.toISOString(),
      nextDay.toISOString()
    );

    trends.push({
      date: date.toISOString().split('T')[0],
      dateFormatted: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      activeTime: parseFloat(summary.totalActiveTimeHours),
      idleTime: parseFloat(summary.totalIdleTimeHours),
      productivityScore: summary.productivityScore,
      totalLogs: summary.totalLogs,
    });
  }

  return trends;
};

// ============================================
// Get Top Applications for Employee
// ============================================
exports.getTopApplications = async (employeeId, limit = 10, days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await ActivityLog.find({
    employeeId,
    timestamp: { $gte: startDate },
  });

  const appMap = new Map();
  logs.forEach((log) => {
    const appName = log.activeWindow.split('-')[0].trim();
    const current = appMap.get(appName) || { duration: 0, count: 0, category: log.windowCategory };
    appMap.set(appName, {
      duration: current.duration + log.duration,
      count: current.count + 1,
      category: log.windowCategory,
    });
  });

  return Array.from(appMap.entries())
    .map(([name, data]) => ({
      name,
      duration: data.duration,
      durationHours: secondsToHours(data.duration),
      count: data.count,
      category: data.category,
      percentage: 0, // Will be calculated below
    }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, limit)
    .map((app, idx, arr) => {
      const totalDuration = arr.reduce((sum, a) => sum + a.duration, 0);
      return {
        ...app,
        percentage: totalDuration > 0 ? Math.round((app.duration / totalDuration) * 100) : 0,
      };
    });
};

// ============================================
// Get Team Summary (Admin)
// ============================================
exports.getTeamSummary = async (startDate, endDate, department = null) => {
  const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
  const end = endDate ? new Date(endDate) : new Date(new Date().setHours(23, 59, 59, 999));

  // Get all employees or by department
  const filter = department ? { department, isActive: true } : { isActive: true };
  const employees = await User.find(filter).select('name email employeeId department position');

  const teamSummaries = await Promise.all(
    employees.map(async (employee) => {
      const summary = await this.getEmployeeSummary(
        employee.employeeId,
        start.toISOString(),
        end.toISOString()
      );

      return {
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        position: employee.position,
        ...summary,
      };
    })
  );

  // Calculate team aggregates
  const teamStats = {
    totalEmployees: teamSummaries.length,
    activeEmployees: teamSummaries.filter((s) => s.totalLogs > 0).length,
    totalActiveTime: teamSummaries.reduce((sum, s) => sum + s.totalActiveTime, 0),
    totalIdleTime: teamSummaries.reduce((sum, s) => sum + s.totalIdleTime, 0),
    averageProductivity: Math.round(
      teamSummaries.reduce((sum, s) => sum + s.productivityScore, 0) / teamSummaries.length
    ),
    topPerformers: teamSummaries
      .filter((s) => s.productivityScore >= 80)
      .sort((a, b) => b.productivityScore - a.productivityScore)
      .slice(0, 5),
    lowPerformers: teamSummaries
      .filter((s) => s.productivityScore < 40 && s.totalLogs > 0)
      .sort((a, b) => a.productivityScore - b.productivityScore)
      .slice(0, 5),
  };

  return {
    date: start.toISOString().split('T')[0],
    teamStats,
    employees: teamSummaries.sort((a, b) => b.productivityScore - a.productivityScore),
  };
};

// ============================================
// Get Hourly Activity Distribution
// ============================================
exports.getHourlyDistribution = async (employeeId, date) => {
  const startDate = date ? new Date(date) : new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);

  const logs = await ActivityLog.find({
    employeeId,
    timestamp: { $gte: startDate, $lt: endDate },
  });

  // Initialize 24-hour array
  const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${hour.toString().padStart(2, '0')}:00`,
    activeTime: 0,
    idleTime: 0,
    totalLogs: 0,
    mouseMoves: 0,
    keyPresses: 0,
  }));

  // Aggregate by hour
  logs.forEach((log) => {
    const hour = new Date(log.timestamp).getHours();
    if (log.idle) {
      hourlyData[hour].idleTime += log.duration;
    } else {
      hourlyData[hour].activeTime += log.duration;
    }
    hourlyData[hour].totalLogs += 1;
    hourlyData[hour].mouseMoves += log.mouseMoves;
    hourlyData[hour].keyPresses += log.keyboardPresses;
  });

  // Convert to minutes and calculate productivity
  return hourlyData.map((data) => ({
    ...data,
    activeMinutes: Math.round(data.activeTime / 60),
    idleMinutes: Math.round(data.idleTime / 60),
    productivity: data.activeTime + data.idleTime > 0
      ? Math.round((data.activeTime / (data.activeTime + data.idleTime)) * 100)
      : 0,
  }));
};

// ============================================
// Get Activity Heatmap Data (for calendar view)
// ============================================
exports.getActivityHeatmap = async (employeeId, days = 30) => {
  const heatmapData = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const logs = await ActivityLog.find({
      employeeId,
      timestamp: { $gte: date, $lt: nextDay },
    });

    const activeTime = logs.filter((log) => !log.idle).reduce((sum, log) => sum + log.duration, 0);
    const totalTime = logs.reduce((sum, log) => sum + log.duration, 0);
    const productivity = totalTime > 0 ? Math.round((activeTime / totalTime) * 100) : 0;

    heatmapData.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
      activeHours: secondsToHours(activeTime),
      totalHours: secondsToHours(totalTime),
      productivity,
      intensity: productivity >= 80 ? 4 : productivity >= 60 ? 3 : productivity >= 40 ? 2 : productivity > 0 ? 1 : 0,
    });
  }

  return heatmapData;
};

// ============================================
// Get Real-Time Activity Status
// ============================================
exports.getRealTimeStatus = async (employeeId) => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const recentLogs = await ActivityLog.find({
    employeeId,
    timestamp: { $gte: fiveMinutesAgo },
  })
    .sort({ timestamp: -1 })
    .limit(1);

  if (recentLogs.length === 0) {
    return {
      employeeId,
      status: 'offline',
      lastSeen: null,
      currentWindow: null,
    };
  }

  const lastLog = recentLogs[0];
  const isOnline = new Date(lastLog.timestamp) >= fiveMinutesAgo;

  return {
    employeeId,
    status: isOnline ? (lastLog.idle ? 'idle' : 'active') : 'offline',
    lastSeen: lastLog.timestamp,
    currentWindow: lastLog.activeWindow,
    deviceInfo: lastLog.deviceInfo,
  };
};

// ============================================
// Get All Online Employees (Admin)
// ============================================
exports.getOnlineEmployees = async () => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  // Get unique employee IDs with recent activity
  const recentActivity = await ActivityLog.aggregate([
    {
      $match: {
        timestamp: { $gte: fiveMinutesAgo },
      },
    },
    {
      $sort: { timestamp: -1 },
    },
    {
      $group: {
        _id: '$employeeId',
        lastActivity: { $first: '$$ROOT' },
      },
    },
  ]);

  const onlineStatuses = await Promise.all(
    recentActivity.map(async (item) => {
      const user = await User.findOne({ employeeId: item._id }).select('name email department position');
      return {
        employeeId: item._id,
        name: user?.name || 'Unknown',
        email: user?.email || '',
        department: user?.department || '',
        position: user?.position || '',
        status: item.lastActivity.idle ? 'idle' : 'active',
        lastSeen: item.lastActivity.timestamp,
        currentWindow: item.lastActivity.activeWindow,
        deviceInfo: item.lastActivity.deviceInfo,
      };
    })
  );

  return onlineStatuses;
};
