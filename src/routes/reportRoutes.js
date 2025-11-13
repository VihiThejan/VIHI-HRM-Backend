/**
 * Report Routes
 * API endpoints for generating CSV and PDF reports
 * VIHI IT Solutions HR System
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const reportGenerator = require('../utils/reportGenerator');

// ============================================
// GET /api/reports/daily/csv
// Generate daily activity report in CSV format
// Access: Private (Employee can see own, Admin can see any)
// Query: employeeId, date
// ============================================
router.get(
  '/daily/csv',
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

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required',
      });
    }

    const report = await reportGenerator.generateDailyCSV(targetEmployeeId, date);

    res.setHeader('Content-Type', report.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    res.send(report.csv);
  })
);

// ============================================
// GET /api/reports/daily/pdf
// Generate daily activity report in PDF format
// Access: Private (Employee can see own, Admin can see any)
// Query: employeeId, date
// ============================================
router.get(
  '/daily/pdf',
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

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required',
      });
    }

    const report = await reportGenerator.generateDailyPDF(targetEmployeeId, date);

    res.setHeader('Content-Type', report.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    res.send(report.pdf);
  })
);

// ============================================
// GET /api/reports/team/csv
// Generate team summary report in CSV format
// Access: Admin only
// Query: startDate, endDate, department
// ============================================
router.get(
  '/team/csv',
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { startDate, endDate, department } = req.query;

    const report = await reportGenerator.generateTeamCSV(startDate, endDate, department);

    res.setHeader('Content-Type', report.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    res.send(report.csv);
  })
);

// ============================================
// GET /api/reports/team/pdf
// Generate team summary report in PDF format
// Access: Admin only
// Query: startDate, endDate, department
// ============================================
router.get(
  '/team/pdf',
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { startDate, endDate, department } = req.query;

    const report = await reportGenerator.generateTeamPDF(startDate, endDate, department);

    res.setHeader('Content-Type', report.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    res.send(report.pdf);
  })
);

module.exports = router;
