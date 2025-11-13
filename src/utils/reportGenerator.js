/**
 * Report Generator Utility
 * Generate CSV and PDF reports from activity data
 * VIHI IT Solutions HR System
 */

const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const analyticsService = require('../services/analyticsService');
const User = require('../models/User');

// ============================================
// Generate Daily Activity Report (CSV)
// ============================================
exports.generateDailyCSV = async (employeeId, date) => {
  const summary = await analyticsService.getEmployeeSummary(employeeId, date, date);
  const user = await User.findOne({ employeeId }).select('name email department position');

  // Prepare data for CSV
  const csvData = [
    {
      'Employee ID': employeeId,
      'Employee Name': user?.name || 'Unknown',
      'Email': user?.email || '',
      'Department': user?.department || '',
      'Position': user?.position || '',
      'Date': summary.date,
      'Total Active Time (hours)': summary.totalActiveTimeHours,
      'Total Idle Time (hours)': summary.totalIdleTimeHours,
      'Total Time (hours)': summary.totalTimeHours,
      'Productivity Score': `${summary.productivityScore}%`,
      'Total Logs': summary.totalLogs,
      'Average Mouse Moves': summary.averageMouseMoves,
      'Average Key Presses': summary.averageKeyPresses,
      'Productive Time (hours)': summary.categoryBreakdown.productive,
      'Neutral Time (hours)': summary.categoryBreakdown.neutral,
      'Unproductive Time (hours)': summary.categoryBreakdown.unproductive,
    },
  ];

  // Add top applications
  summary.topApplications.forEach((app, index) => {
    csvData[0][`Top App ${index + 1}`] = app.name;
    csvData[0][`Top App ${index + 1} Duration (hours)`] = app.durationHours;
    csvData[0][`Top App ${index + 1} Category`] = app.category;
  });

  const parser = new Parser();
  const csv = parser.parse(csvData);

  return {
    csv,
    filename: `activity_report_${employeeId}_${summary.date}.csv`,
    contentType: 'text/csv',
  };
};

// ============================================
// Generate Team Summary Report (CSV)
// ============================================
exports.generateTeamCSV = async (startDate, endDate, department = null) => {
  const teamSummary = await analyticsService.getTeamSummary(startDate, endDate, department);

  const csvData = teamSummary.employees.map((emp) => ({
    'Employee ID': emp.employeeId,
    'Name': emp.name,
    'Email': emp.email,
    'Department': emp.department,
    'Position': emp.position,
    'Date': emp.date,
    'Total Active Time (hours)': emp.totalActiveTimeHours,
    'Total Idle Time (hours)': emp.totalIdleTimeHours,
    'Productivity Score': `${emp.productivityScore}%`,
    'Total Logs': emp.totalLogs,
    'Top Application': emp.topApplications[0]?.name || 'N/A',
    'Top App Duration (hours)': emp.topApplications[0]?.durationHours || 0,
  }));

  const parser = new Parser();
  const csv = parser.parse(csvData);

  return {
    csv,
    filename: `team_report_${teamSummary.date}.csv`,
    contentType: 'text/csv',
  };
};

// ============================================
// Generate Daily Activity Report (PDF)
// ============================================
exports.generateDailyPDF = async (employeeId, date) => {
  const summary = await analyticsService.getEmployeeSummary(employeeId, date, date);
  const user = await User.findOne({ employeeId }).select('name email department position');
  const trend = await analyticsService.getProductivityTrend(employeeId, 7);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve({
          pdf: pdfBuffer,
          filename: `activity_report_${employeeId}_${summary.date}.pdf`,
          contentType: 'application/pdf',
        });
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(20).fillColor('#2563eb').text('VIHI IT Solutions', { align: 'center' });
      doc.fontSize(16).fillColor('#000').text('Employee Activity Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#666').text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(1);

      // Employee Information Section
      doc.fontSize(14).fillColor('#1f2937').text('Employee Information', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#000');
      doc.text(`Name: ${user?.name || 'Unknown'}`);
      doc.text(`Employee ID: ${employeeId}`);
      doc.text(`Email: ${user?.email || 'N/A'}`);
      doc.text(`Department: ${user?.department || 'N/A'}`);
      doc.text(`Position: ${user?.position || 'N/A'}`);
      doc.text(`Report Date: ${summary.date}`);
      doc.moveDown(1);

      // Summary Statistics Section
      doc.fontSize(14).fillColor('#1f2937').text('Activity Summary', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#000');
      doc.text(`Total Active Time: ${summary.totalActiveTimeHours} hours`);
      doc.text(`Total Idle Time: ${summary.totalIdleTimeHours} hours`);
      doc.text(`Total Time: ${summary.totalTimeHours} hours`);
      doc.text(`Productivity Score: ${summary.productivityScore}%`, {
        continued: true,
      });
      
      // Add productivity indicator
      if (summary.productivityScore >= 80) {
        doc.fillColor('#10b981').text(' (Excellent)', { continued: false });
      } else if (summary.productivityScore >= 60) {
        doc.fillColor('#f59e0b').text(' (Good)', { continued: false });
      } else {
        doc.fillColor('#ef4444').text(' (Needs Improvement)', { continued: false });
      }
      
      doc.fillColor('#000');
      doc.text(`Total Activity Logs: ${summary.totalLogs}`);
      doc.text(`Average Mouse Moves: ${summary.averageMouseMoves} per minute`);
      doc.text(`Average Key Presses: ${summary.averageKeyPresses} per minute`);
      doc.moveDown(1);

      // Category Breakdown Section
      doc.fontSize(14).fillColor('#1f2937').text('Time Breakdown by Category', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#10b981');
      doc.text(`Productive Time: ${summary.categoryBreakdown.productive} hours`);
      doc.fillColor('#3b82f6');
      doc.text(`Neutral Time: ${summary.categoryBreakdown.neutral} hours`);
      doc.fillColor('#ef4444');
      doc.text(`Unproductive Time: ${summary.categoryBreakdown.unproductive} hours`);
      doc.fillColor('#000');
      doc.moveDown(1);

      // Top Applications Section
      if (summary.topApplications.length > 0) {
        doc.fontSize(14).fillColor('#1f2937').text('Top Applications Used', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#000');

        summary.topApplications.slice(0, 10).forEach((app, index) => {
          const categoryColor =
            app.category === 'productive' ? '#10b981' :
            app.category === 'neutral' ? '#3b82f6' : '#ef4444';

          doc.fillColor('#000').text(`${index + 1}. ${app.name}`, { continued: true });
          doc.text(` - ${app.durationHours} hours (${app.count} times)`, { continued: true });
          doc.fillColor(categoryColor).text(` [${app.category}]`, { continued: false });
        });
        doc.moveDown(1);
      }

      // 7-Day Productivity Trend Section
      doc.addPage();
      doc.fontSize(14).fillColor('#1f2937').text('7-Day Productivity Trend', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#000');

      trend.forEach((day) => {
        doc.text(`${day.dateFormatted}: ${day.productivityScore}% productivity (${day.activeTime}h active, ${day.idleTime}h idle)`);
      });
      doc.moveDown(1);

      // Footer
      doc.fontSize(9).fillColor('#666');
      doc.text('This report is confidential and intended for internal use only.', { align: 'center' });
      doc.text('© VIHI IT Solutions - All Rights Reserved', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// ============================================
// Generate Team Summary Report (PDF)
// ============================================
exports.generateTeamPDF = async (startDate, endDate, department = null) => {
  const teamSummary = await analyticsService.getTeamSummary(startDate, endDate, department);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve({
          pdf: pdfBuffer,
          filename: `team_report_${teamSummary.date}.pdf`,
          contentType: 'application/pdf',
        });
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(20).fillColor('#2563eb').text('VIHI IT Solutions', { align: 'center' });
      doc.fontSize(16).fillColor('#000').text('Team Activity Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#666').text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' });
      doc.text(`Report Period: ${teamSummary.date}`, { align: 'center' });
      if (department) {
        doc.text(`Department: ${department}`, { align: 'center' });
      }
      doc.moveDown(1);

      // Team Statistics Section
      doc.fontSize(14).fillColor('#1f2937').text('Team Overview', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#000');
      doc.text(`Total Employees: ${teamSummary.teamStats.totalEmployees}`);
      doc.text(`Active Employees: ${teamSummary.teamStats.activeEmployees}`);
      doc.text(`Total Active Time: ${(teamSummary.teamStats.totalActiveTime / 3600).toFixed(2)} hours`);
      doc.text(`Total Idle Time: ${(teamSummary.teamStats.totalIdleTime / 3600).toFixed(2)} hours`);
      doc.text(`Average Team Productivity: ${teamSummary.teamStats.averageProductivity}%`);
      doc.moveDown(1);

      // Top Performers Section
      if (teamSummary.teamStats.topPerformers.length > 0) {
        doc.fontSize(14).fillColor('#10b981').text('Top Performers (≥80% Productivity)', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#000');

        teamSummary.teamStats.topPerformers.forEach((emp, index) => {
          doc.text(`${index + 1}. ${emp.name} (${emp.employeeId}) - ${emp.productivityScore}% productivity`);
        });
        doc.moveDown(1);
      }

      // Low Performers Section
      if (teamSummary.teamStats.lowPerformers.length > 0) {
        doc.fontSize(14).fillColor('#ef4444').text('Employees Needing Support (<40% Productivity)', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#000');

        teamSummary.teamStats.lowPerformers.forEach((emp, index) => {
          doc.text(`${index + 1}. ${emp.name} (${emp.employeeId}) - ${emp.productivityScore}% productivity`);
        });
        doc.moveDown(1);
      }

      // Employee Details Section
      doc.addPage();
      doc.fontSize(14).fillColor('#1f2937').text('Employee Details', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9);

      teamSummary.employees.forEach((emp, index) => {
        if (index > 0 && index % 15 === 0) {
          doc.addPage();
        }

        const productivityColor =
          emp.productivityScore >= 80 ? '#10b981' :
          emp.productivityScore >= 60 ? '#3b82f6' :
          emp.productivityScore >= 40 ? '#f59e0b' : '#ef4444';

        doc.fillColor('#000').text(`${emp.name} (${emp.employeeId})`, { continued: true });
        doc.fillColor(productivityColor).text(` - ${emp.productivityScore}%`, { continued: false });
        doc.fillColor('#666').fontSize(8);
        doc.text(`  ${emp.department} | ${emp.position} | ${emp.totalActiveTimeHours}h active`);
        doc.fontSize(9).fillColor('#000');
        doc.moveDown(0.3);
      });

      // Footer
      doc.fontSize(9).fillColor('#666');
      doc.text('This report is confidential and intended for internal use only.', { align: 'center' });
      doc.text('© VIHI IT Solutions - All Rights Reserved', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
