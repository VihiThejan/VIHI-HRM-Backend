/**
 * AI Routes
 * Routes for AI-driven productivity analysis, anomaly detection, and alerting
 * VIHI IT Solutions - Stage 4
 */

const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const aiController = require('../controllers/aiController');

// ============================================
// PRODUCTIVITY SCORE ROUTES
// ============================================

// Get employee score for specific date
router.get('/score/:employeeId/:date', protect, aiController.getEmployeeScore);

// Get employee score trend (last N days)
router.get('/score/:employeeId/trend/:days', protect, aiController.getScoreTrend);

// Get team scores for date (Admin only)
router.get('/team/scores/:date', protect, adminOnly, aiController.getTeamScores);

// Get performance distribution (Admin only)
router.get('/performance/distribution', protect, adminOnly, aiController.getPerformanceDistribution);

// Recalculate scores for date (Admin only)
router.post('/recalculate/:date', protect, adminOnly, aiController.recalculateScores);

// ============================================
// ANOMALY DETECTION ROUTES
// ============================================

// Get employee anomalies
router.get('/anomalies/:employeeId', protect, aiController.getEmployeeAnomalies);

// Get all unresolved anomalies (Admin only)
router.get('/anomalies', protect, adminOnly, aiController.getAllAnomalies);

// Get anomaly statistics (Admin only)
router.get('/anomalies/stats', protect, adminOnly, aiController.getAnomalyStats);

// Detect anomalies for employee (Admin only)
router.post('/anomalies/detect/:employeeId/:date', protect, adminOnly, aiController.detectAnomalies);

// Resolve anomaly (Admin only)
router.patch('/anomalies/:anomalyId/resolve', protect, adminOnly, aiController.resolveAnomaly);

// ============================================
// ALERT ROUTES
// ============================================

// Send alert for anomaly (Admin only)
router.post('/alerts/send/:anomalyId', protect, adminOnly, aiController.sendAlert);

// Test alert system (Admin only)
router.post('/alerts/test', protect, adminOnly, aiController.testAlerts);

// ============================================
// CRON JOB ROUTES
// ============================================

// Run manual analysis (Admin only)
router.post('/analysis/run', protect, adminOnly, aiController.runManualAnalysis);

// Get cron job status (Admin only)
router.get('/cron/status', protect, adminOnly, aiController.getCronStatus);

module.exports = router;
