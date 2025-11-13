/**
 * Anomaly Detection Service
 * Detects productivity anomalies using 7-day baseline comparison
 * VIHI IT Solutions - Stage 4
 */

const ActivityLog = require('../models/ActivityLog');
const ProductivitySummary = require('../models/ProductivitySummary');
const Anomaly = require('../models/Anomaly');
const User = require('../models/User');

// ============================================
// CONSTANTS
// ============================================
const BASELINE_DAYS = 7; // Days to calculate baseline
const DEVIATION_THRESHOLD = 40; // 40% deviation triggers anomaly

const ANOMALY_TYPES = {
  LOW_ACTIVITY: 'Low Activity',
  IDLE_SPIKE: 'Idle Spike',
  NO_DATA: 'No Data',
  LATE_START: 'Late Start',
  EARLY_END: 'Early End',
  EXTENDED_IDLE: 'Extended Idle',
};

const THRESHOLDS = {
  STANDARD_START_HOUR: 9,
  STANDARD_END_HOUR: 17,
  LATE_START_THRESHOLD: 2, // Hours late
  EARLY_END_THRESHOLD: 2, // Hours early
  EXTENDED_IDLE_MINUTES: 120, // 2 hours continuous idle
  MIN_EXPECTED_SCORE: 40, // Minimum acceptable score
};

// ============================================
// Calculate 7-Day Baseline
// ============================================
exports.calculateBaseline = async (employeeId, targetDate) => {
  const endDate = new Date(targetDate);
  endDate.setDate(endDate.getDate() - 1); // Exclude target date
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (BASELINE_DAYS - 1));
  startDate.setHours(0, 0, 0, 0);

  const summaries = await ProductivitySummary.find({
    employeeId,
    date: { $gte: startDate, $lte: endDate },
  }).lean();

  if (summaries.length === 0) {
    return null; // No baseline data
  }

  // Calculate averages
  const totalScore = summaries.reduce((sum, s) => sum + s.score, 0);
  const totalActiveTime = summaries.reduce((sum, s) => sum + s.activeTime, 0);
  const totalIdleTime = summaries.reduce((sum, s) => sum + s.idleTime, 0);
  const totalMouseMoves = summaries.reduce((sum, s) => sum + s.totalMouseMoves, 0);
  const totalKeyPresses = summaries.reduce((sum, s) => sum + s.totalKeyPresses, 0);

  const count = summaries.length;

  // Calculate average work hours
  const startHours = summaries
    .filter((s) => s.workHoursStart !== null)
    .map((s) => s.workHoursStart);
  const endHours = summaries
    .filter((s) => s.workHoursEnd !== null)
    .map((s) => s.workHoursEnd);

  const avgStartHour = startHours.length > 0
    ? startHours.reduce((a, b) => a + b, 0) / startHours.length
    : THRESHOLDS.STANDARD_START_HOUR;

  const avgEndHour = endHours.length > 0
    ? endHours.reduce((a, b) => a + b, 0) / endHours.length
    : THRESHOLDS.STANDARD_END_HOUR;

  return {
    avgScore: totalScore / count,
    avgActiveTime: totalActiveTime / count,
    avgIdleTime: totalIdleTime / count,
    avgMouseMoves: totalMouseMoves / count,
    avgKeyPresses: totalKeyPresses / count,
    avgStartHour: Math.round(avgStartHour),
    avgEndHour: Math.round(avgEndHour),
    sampleSize: count,
    startDate,
    endDate,
  };
};

// ============================================
// Detect Anomalies for Employee on Date
// ============================================
exports.detectAnomalies = async (employeeId, date) => {
  const user = await User.findOne({ employeeId });
  if (!user) {
    throw new Error(`User with employeeId ${employeeId} not found`);
  }

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  // Get baseline
  const baseline = await this.calculateBaseline(employeeId, targetDate);
  if (!baseline) {
    console.log(`No baseline data for ${employeeId} - skipping anomaly detection`);
    return [];
  }

  // Get current day summary
  const summary = await ProductivitySummary.findOne({
    employeeId,
    date: targetDate,
  });

  // Get activity logs for extended idle detection
  const startDate = new Date(targetDate);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(targetDate);
  endDate.setHours(23, 59, 59, 999);

  const logs = await ActivityLog.find({
    employeeId,
    timestamp: { $gte: startDate, $lte: endDate },
  }).sort({ timestamp: 1 });

  const detectedAnomalies = [];

  // ============================================
  // 1. NO DATA ANOMALY
  // ============================================
  if (!summary || logs.length === 0) {
    detectedAnomalies.push({
      user: user._id,
      employeeId,
      date: targetDate,
      type: ANOMALY_TYPES.NO_DATA,
      actualValue: 0,
      expectedValue: baseline.avgScore,
      deviationPercent: 100,
      description: `No activity logged for ${user.name} on ${targetDate.toDateString()}. Expected average score: ${Math.round(baseline.avgScore)}`,
    });
    
    // If no data, no point checking other anomalies
    return await this.saveAnomalies(detectedAnomalies);
  }

  // ============================================
  // 2. LOW ACTIVITY ANOMALY
  // ============================================
  const scoreDiff = baseline.avgScore - summary.score;
  const scoreDeviationPercent = (scoreDiff / baseline.avgScore) * 100;

  if (scoreDeviationPercent >= DEVIATION_THRESHOLD && summary.score < baseline.avgScore) {
    detectedAnomalies.push({
      user: user._id,
      employeeId,
      date: targetDate,
      type: ANOMALY_TYPES.LOW_ACTIVITY,
      actualValue: summary.score,
      expectedValue: Math.round(baseline.avgScore),
      deviationPercent: Math.round(scoreDeviationPercent),
      description: `Productivity score (${summary.score}) is ${Math.round(scoreDeviationPercent)}% below baseline (${Math.round(baseline.avgScore)}) for ${user.name}`,
    });
  }

  // ============================================
  // 3. IDLE SPIKE ANOMALY
  // ============================================
  const idleDiff = summary.idleTime - baseline.avgIdleTime;
  const idleDeviationPercent = (idleDiff / baseline.avgIdleTime) * 100;

  if (idleDeviationPercent >= DEVIATION_THRESHOLD) {
    const idleHours = (summary.idleTime / 3600).toFixed(1);
    const expectedIdleHours = (baseline.avgIdleTime / 3600).toFixed(1);
    
    detectedAnomalies.push({
      user: user._id,
      employeeId,
      date: targetDate,
      type: ANOMALY_TYPES.IDLE_SPIKE,
      actualValue: Math.round(summary.idleTime),
      expectedValue: Math.round(baseline.avgIdleTime),
      deviationPercent: Math.round(idleDeviationPercent),
      description: `Idle time (${idleHours}h) is ${Math.round(idleDeviationPercent)}% above baseline (${expectedIdleHours}h) for ${user.name}`,
    });
  }

  // ============================================
  // 4. LATE START ANOMALY
  // ============================================
  if (summary.workHoursStart !== null) {
    const startDiff = summary.workHoursStart - baseline.avgStartHour;
    if (startDiff >= THRESHOLDS.LATE_START_THRESHOLD) {
      const deviationPercent = (startDiff / baseline.avgStartHour) * 100;
      
      detectedAnomalies.push({
        user: user._id,
        employeeId,
        date: targetDate,
        type: ANOMALY_TYPES.LATE_START,
        actualValue: summary.workHoursStart,
        expectedValue: baseline.avgStartHour,
        deviationPercent: Math.round(deviationPercent),
        description: `Work started at ${summary.workHoursStart}:00, which is ${Math.round(startDiff)}h later than usual (${baseline.avgStartHour}:00) for ${user.name}`,
      });
    }
  }

  // ============================================
  // 5. EARLY END ANOMALY
  // ============================================
  if (summary.workHoursEnd !== null) {
    const endDiff = baseline.avgEndHour - summary.workHoursEnd;
    if (endDiff >= THRESHOLDS.EARLY_END_THRESHOLD) {
      const deviationPercent = (endDiff / baseline.avgEndHour) * 100;
      
      detectedAnomalies.push({
        user: user._id,
        employeeId,
        date: targetDate,
        type: ANOMALY_TYPES.EARLY_END,
        actualValue: summary.workHoursEnd,
        expectedValue: baseline.avgEndHour,
        deviationPercent: Math.round(deviationPercent),
        description: `Work ended at ${summary.workHoursEnd}:00, which is ${Math.round(endDiff)}h earlier than usual (${baseline.avgEndHour}:00) for ${user.name}`,
      });
    }
  }

  // ============================================
  // 6. EXTENDED IDLE ANOMALY
  // ============================================
  let maxConsecutiveIdleSeconds = 0;
  let currentIdleSeconds = 0;

  logs.forEach((log) => {
    if (log.idle) {
      currentIdleSeconds += log.duration;
      if (currentIdleSeconds > maxConsecutiveIdleSeconds) {
        maxConsecutiveIdleSeconds = currentIdleSeconds;
      }
    } else {
      currentIdleSeconds = 0;
    }
  });

  const maxIdleMinutes = maxConsecutiveIdleSeconds / 60;
  if (maxIdleMinutes >= THRESHOLDS.EXTENDED_IDLE_MINUTES) {
    const expectedIdleMinutes = (baseline.avgIdleTime / 60).toFixed(0);
    const deviationPercent = ((maxIdleMinutes - expectedIdleMinutes) / expectedIdleMinutes) * 100;
    
    detectedAnomalies.push({
      user: user._id,
      employeeId,
      date: targetDate,
      type: ANOMALY_TYPES.EXTENDED_IDLE,
      actualValue: Math.round(maxIdleMinutes),
      expectedValue: Math.round(expectedIdleMinutes),
      deviationPercent: Math.round(deviationPercent),
      description: `Extended idle period of ${Math.round(maxIdleMinutes)} minutes detected for ${user.name} (expected: ${expectedIdleMinutes} min average)`,
    });
  }

  // Save anomalies to database
  return await this.saveAnomalies(detectedAnomalies);
};

// ============================================
// Save Anomalies to Database
// ============================================
exports.saveAnomalies = async (anomaliesData) => {
  const savedAnomalies = [];

  for (const anomalyData of anomaliesData) {
    // Check if anomaly already exists
    const existing = await Anomaly.findOne({
      employeeId: anomalyData.employeeId,
      date: anomalyData.date,
      type: anomalyData.type,
    });

    if (existing) {
      // Update existing anomaly
      Object.assign(existing, anomalyData);
      await existing.save();
      savedAnomalies.push(existing);
    } else {
      // Create new anomaly
      const anomaly = await Anomaly.create(anomalyData);
      savedAnomalies.push(anomaly);
    }
  }

  return savedAnomalies;
};

// ============================================
// Get Unresolved Anomalies for Employee
// ============================================
exports.getUnresolvedAnomalies = async (employeeId, days = 7) => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const anomalies = await Anomaly.find({
    employeeId,
    date: { $gte: startDate, $lte: endDate },
    resolved: false,
  })
    .sort({ date: -1, severity: -1 })
    .populate('user', 'name email department');

  return anomalies;
};

// ============================================
// Get All Unresolved Anomalies (Admin)
// ============================================
exports.getAllUnresolvedAnomalies = async (department = null) => {
  const filter = { resolved: false };
  
  if (department) {
    const User = require('../models/User');
    const users = await User.find({ department }).select('_id');
    const userIds = users.map(u => u._id);
    filter.user = { $in: userIds };
  }

  const anomalies = await Anomaly.find(filter)
    .sort({ date: -1, severity: -1 })
    .populate('user', 'name email employeeId department position')
    .lean();

  return anomalies;
};

// ============================================
// Resolve Anomaly
// ============================================
exports.resolveAnomaly = async (anomalyId, userId, notes) => {
  const anomaly = await Anomaly.findById(anomalyId);
  if (!anomaly) {
    throw new Error('Anomaly not found');
  }

  if (anomaly.resolved) {
    throw new Error('Anomaly already resolved');
  }

  anomaly.markResolved(userId, notes);
  await anomaly.save();

  return anomaly;
};

// ============================================
// Get Anomaly Statistics (Admin)
// ============================================
exports.getAnomalyStats = async (days = 30) => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const anomalies = await Anomaly.find({
    date: { $gte: startDate, $lte: endDate },
  }).lean();

  // Count by type
  const typeStats = {};
  Object.values(ANOMALY_TYPES).forEach((type) => {
    typeStats[type] = {
      total: 0,
      resolved: 0,
      unresolved: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
  });

  anomalies.forEach((a) => {
    if (typeStats[a.type]) {
      typeStats[a.type].total++;
      if (a.resolved) {
        typeStats[a.type].resolved++;
      } else {
        typeStats[a.type].unresolved++;
      }
      
      const severity = a.severity.toLowerCase();
      if (typeStats[a.type][severity] !== undefined) {
        typeStats[a.type][severity]++;
      }
    }
  });

  // Overall stats
  const totalAnomalies = anomalies.length;
  const resolved = anomalies.filter((a) => a.resolved).length;
  const unresolved = totalAnomalies - resolved;

  return {
    totalAnomalies,
    resolved,
    unresolved,
    resolutionRate: totalAnomalies > 0 ? ((resolved / totalAnomalies) * 100).toFixed(1) : 0,
    typeStats,
    periodDays: days,
  };
};

// ============================================
// Detect Anomalies for All Active Employees
// ============================================
exports.detectAnomaliesForAllEmployees = async (date) => {
  const users = await User.find({ isActive: true }).select('employeeId');
  
  const results = {
    success: [],
    failed: [],
    totalAnomalies: 0,
  };

  for (const user of users) {
    try {
      const anomalies = await this.detectAnomalies(user.employeeId, date);
      results.success.push({
        employeeId: user.employeeId,
        anomaliesDetected: anomalies.length,
      });
      results.totalAnomalies += anomalies.length;
    } catch (error) {
      results.failed.push({
        employeeId: user.employeeId,
        error: error.message,
      });
    }
  }

  return results;
};
