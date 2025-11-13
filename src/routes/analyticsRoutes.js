/**
 * Analytics Routes
 * API endpoints for analytics and reporting
 * VIHI IT Solutions HR System
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const analyticsService = require('../services/analyticsService');

// ============================================
// GET /api/analytics/summary
// Get employee activity summary
// Access: Private (Employee can see own, Admin can see any)
// Query: employeeId, startDate, endDate
// ============================================
router.get(
  '/summary',
  protect,
  asyncHandler(async (req, res) => {
    const { employeeId, startDate, endDate } = req.query;

    // Employees can only view their own data
    const targetEmployeeId = req.user.role === 'admin' ? employeeId : req.user.employeeId;

    if (!targetEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const summary = await analyticsService.getEmployeeSummary(targetEmployeeId, startDate, endDate);

    res.status(200).json({
      success: true,
      data: summary,
    });
  })
);

// ============================================
// GET /api/analytics/productivity-trend
// Get 7-day productivity trend for employee
// Access: Private (Employee can see own, Admin can see any)
// Query: employeeId, days (default: 7)
// ============================================
router.get(
  '/productivity-trend',
  protect,
  asyncHandler(async (req, res) => {
    const { employeeId, days } = req.query;

    // Employees can only view their own data
    const targetEmployeeId = req.user.role === 'admin' ? employeeId : req.user.employeeId;

    if (!targetEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const trend = await analyticsService.getProductivityTrend(
      targetEmployeeId,
      parseInt(days) || 7
    );

    res.status(200).json({
      success: true,
      data: trend,
    });
  })
);

// ============================================
// GET /api/analytics/top-apps
// Get top applications used by employee
// Access: Private (Employee can see own, Admin can see any)
// Query: employeeId, limit, days
// ============================================
router.get(
  '/top-apps',
  protect,
  asyncHandler(async (req, res) => {
    const { employeeId, limit, days } = req.query;

    // Employees can only view their own data
    const targetEmployeeId = req.user.role === 'admin' ? employeeId : req.user.employeeId;

    if (!targetEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const topApps = await analyticsService.getTopApplications(
      targetEmployeeId,
      parseInt(limit) || 10,
      parseInt(days) || 30
    );

    res.status(200).json({
      success: true,
      data: topApps,
    });
  })
);

// ============================================
// GET /api/analytics/team-summary
// Get team-wide summary statistics
// Access: Admin only
// Query: startDate, endDate, department
// ============================================
router.get(
  '/team-summary',
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { startDate, endDate, department } = req.query;

    const teamSummary = await analyticsService.getTeamSummary(startDate, endDate, department);

    res.status(200).json({
      success: true,
      data: teamSummary,
    });
  })
);

// ============================================
// GET /api/analytics/hourly-distribution
// Get hourly activity distribution for a day
// Access: Private (Employee can see own, Admin can see any)
// Query: employeeId, date
// ============================================
router.get(
  '/hourly-distribution',
  protect,
  asyncHandler(async (req, res) => {
    const { employeeId, date } = req.query;

    // Employees can only view their own data
    const targetEmployeeId = req.user.role === 'admin' ? employeeId : req.user.employeeId;

    if (!targetEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const hourlyData = await analyticsService.getHourlyDistribution(targetEmployeeId, date);

    res.status(200).json({
      success: true,
      data: hourlyData,
    });
  })
);

// ============================================
// GET /api/analytics/heatmap
// Get activity heatmap data (calendar view)
// Access: Private (Employee can see own, Admin can see any)
// Query: employeeId, days (default: 30)
// ============================================
router.get(
  '/heatmap',
  protect,
  asyncHandler(async (req, res) => {
    const { employeeId, days } = req.query;

    // Employees can only view their own data
    const targetEmployeeId = req.user.role === 'admin' ? employeeId : req.user.employeeId;

    if (!targetEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const heatmapData = await analyticsService.getActivityHeatmap(
      targetEmployeeId,
      parseInt(days) || 30
    );

    res.status(200).json({
      success: true,
      data: heatmapData,
    });
  })
);

// ============================================
// GET /api/analytics/real-time-status
// Get real-time activity status of employee
// Access: Private (Employee can see own, Admin can see any)
// Query: employeeId
// ============================================
router.get(
  '/real-time-status',
  protect,
  asyncHandler(async (req, res) => {
    const { employeeId } = req.query;

    // Employees can only view their own data
    const targetEmployeeId = req.user.role === 'admin' ? employeeId : req.user.employeeId;

    if (!targetEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const status = await analyticsService.getRealTimeStatus(targetEmployeeId);

    res.status(200).json({
      success: true,
      data: status,
    });
  })
);

// ============================================
// GET /api/analytics/online-employees
// Get list of all currently online employees
// Access: Admin only
// ============================================
router.get(
  '/online-employees',
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const onlineEmployees = await analyticsService.getOnlineEmployees();

    res.status(200).json({
      success: true,
      count: onlineEmployees.length,
      data: onlineEmployees,
    });
  })
);

module.exports = router;
