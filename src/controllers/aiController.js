/**
 * AI Controller
 * Handles AI-driven productivity scoring, anomaly detection, and alerting
 * VIHI IT Solutions - Stage 4
 */

const asyncHandler = require('../middleware/asyncHandler');
const aiProductivityService = require('../services/aiProductivityService');
const anomalyDetectionService = require('../services/anomalyDetectionService');
const alertManager = require('../utils/alertManager');
const cronJobManager = require('../services/cronJobManager');

// @desc    Get employee AI productivity score for date
// @route   GET /api/ai/score/:employeeId/:date
// @access  Private
exports.getEmployeeScore = asyncHandler(async (req, res) => {
  const { employeeId, date } = req.params;

  const score = await aiProductivityService.getEmployeeScore(employeeId, date);

  res.json({
    success: true,
    data: score,
  });
});

// @desc    Get employee score trend (last N days)
// @route   GET /api/ai/score/:employeeId/trend/:days
// @access  Private
exports.getScoreTrend = asyncHandler(async (req, res) => {
  const { employeeId, days } = req.params;

  const trend = await aiProductivityService.getScoreTrend(
    employeeId,
    parseInt(days) || 7
  );

  res.json({
    success: true,
    data: trend,
  });
});

// @desc    Get team scores for date
// @route   GET /api/ai/team/scores/:date
// @access  Private (Admin only)
exports.getTeamScores = asyncHandler(async (req, res) => {
  const { date } = req.params;
  const { department } = req.query;

  const teamScores = await aiProductivityService.getTeamScores(date, department);

  res.json({
    success: true,
    data: teamScores,
  });
});

// @desc    Get performance distribution
// @route   GET /api/ai/performance/distribution
// @access  Private (Admin only)
exports.getPerformanceDistribution = asyncHandler(async (req, res) => {
  const { days } = req.query;

  const distribution = await aiProductivityService.getPerformanceDistribution(
    parseInt(days) || 30
  );

  res.json({
    success: true,
    data: distribution,
  });
});

// @desc    Recalculate scores for date
// @route   POST /api/ai/recalculate/:date
// @access  Private (Admin only)
exports.recalculateScores = asyncHandler(async (req, res) => {
  const { date } = req.params;

  const results = await aiProductivityService.recalculateScoresForDate(date);

  res.json({
    success: true,
    message: 'Scores recalculated successfully',
    data: results,
  });
});

// @desc    Get unresolved anomalies for employee
// @route   GET /api/ai/anomalies/:employeeId
// @access  Private
exports.getEmployeeAnomalies = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { days } = req.query;

  const anomalies = await anomalyDetectionService.getUnresolvedAnomalies(
    employeeId,
    parseInt(days) || 7
  );

  res.json({
    success: true,
    count: anomalies.length,
    data: anomalies,
  });
});

// @desc    Get all unresolved anomalies
// @route   GET /api/ai/anomalies
// @access  Private (Admin only)
exports.getAllAnomalies = asyncHandler(async (req, res) => {
  const { department } = req.query;

  const anomalies = await anomalyDetectionService.getAllUnresolvedAnomalies(department);

  res.json({
    success: true,
    count: anomalies.length,
    data: anomalies,
  });
});

// @desc    Resolve anomaly
// @route   PATCH /api/ai/anomalies/:anomalyId/resolve
// @access  Private (Admin only)
exports.resolveAnomaly = asyncHandler(async (req, res) => {
  const { anomalyId } = req.params;
  const { notes } = req.body;
  const userId = req.user._id;

  const anomaly = await anomalyDetectionService.resolveAnomaly(
    anomalyId,
    userId,
    notes
  );

  res.json({
    success: true,
    message: 'Anomaly resolved successfully',
    data: anomaly,
  });
});

// @desc    Get anomaly statistics
// @route   GET /api/ai/anomalies/stats
// @access  Private (Admin only)
exports.getAnomalyStats = asyncHandler(async (req, res) => {
  const { days } = req.query;

  const stats = await anomalyDetectionService.getAnomalyStats(parseInt(days) || 30);

  res.json({
    success: true,
    data: stats,
  });
});

// @desc    Detect anomalies for employee
// @route   POST /api/ai/anomalies/detect/:employeeId/:date
// @access  Private (Admin only)
exports.detectAnomalies = asyncHandler(async (req, res) => {
  const { employeeId, date } = req.params;

  const anomalies = await anomalyDetectionService.detectAnomalies(employeeId, date);

  res.json({
    success: true,
    message: 'Anomaly detection completed',
    count: anomalies.length,
    data: anomalies,
  });
});

// @desc    Send alert for anomaly
// @route   POST /api/ai/alerts/send/:anomalyId
// @access  Private (Admin only)
exports.sendAlert = asyncHandler(async (req, res) => {
  const { anomalyId } = req.params;

  const results = await alertManager.sendAlert(anomalyId);

  res.json({
    success: true,
    message: 'Alert sent successfully',
    data: results,
  });
});

// @desc    Test alert system
// @route   POST /api/ai/alerts/test
// @access  Private (Admin only)
exports.testAlerts = asyncHandler(async (req, res) => {
  const testResults = await alertManager.testAlerts();

  res.json({
    success: true,
    message: 'Alert system tested',
    data: testResults,
  });
});

// @desc    Run manual daily analysis
// @route   POST /api/ai/analysis/run
// @access  Private (Admin only)
exports.runManualAnalysis = asyncHandler(async (req, res) => {
  const { date } = req.body;

  const results = await cronJobManager.runManualAnalysis(date);

  res.json({
    success: true,
    message: 'Manual analysis completed',
    data: results,
  });
});

// @desc    Get cron job status
// @route   GET /api/ai/cron/status
// @access  Private (Admin only)
exports.getCronStatus = asyncHandler(async (req, res) => {
  const status = cronJobManager.getCronStatus();

  res.json({
    success: true,
    data: status,
  });
});

module.exports = exports;
