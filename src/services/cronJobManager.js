/**
 * Cron Job Manager
 * Automates daily AI analysis and alerting
 * VIHI IT Solutions - Stage 4
 */

const cron = require('node-cron');
const aiProductivityService = require('./aiProductivityService');
const anomalyDetectionService = require('./anomalyDetectionService');
const alertManager = require('../utils/alertManager');
const User = require('../models/User');

// ============================================
// Run Daily Analysis for All Employees
// ============================================
exports.runDailyAnalysis = async (date = null) => {
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setDate(targetDate.getDate() - 1); // Analyze previous day
  targetDate.setHours(0, 0, 0, 0);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🤖 DAILY AI ANALYSIS STARTED`);
  console.log(`📅 Analyzing date: ${targetDate.toDateString()}`);
  console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
  console.log(`${'='.repeat(60)}\n`);

  const results = {
    date: targetDate,
    startTime: new Date(),
    scores: { success: [], failed: [] },
    anomalies: { success: [], failed: [], totalDetected: 0 },
    alerts: { sent: 0, failed: 0 },
    totalEmployees: 0,
  };

  try {
    // Step 1: Get all active employees
    const users = await User.find({ isActive: true }).select('employeeId name');
    results.totalEmployees = users.length;

    console.log(`👥 Found ${users.length} active employees\n`);

    // Step 2: Calculate productivity scores
    console.log('📊 STEP 1/3: Calculating Productivity Scores');
    console.log('-'.repeat(60));

    for (const user of users) {
      try {
        await aiProductivityService.storeDailySummary(user.employeeId, targetDate);
        results.scores.success.push(user.employeeId);
        console.log(`  ✅ ${user.employeeId} - ${user.name}`);
      } catch (error) {
        results.scores.failed.push({
          employeeId: user.employeeId,
          error: error.message,
        });
        console.error(`  ❌ ${user.employeeId} - ${error.message}`);
      }
    }

    console.log(`\n✅ Scores calculated: ${results.scores.success.length}/${users.length}`);
    if (results.scores.failed.length > 0) {
      console.log(`❌ Failed: ${results.scores.failed.length}`);
    }

    // Step 3: Detect anomalies
    console.log(`\n🔍 STEP 2/3: Detecting Anomalies`);
    console.log('-'.repeat(60));

    for (const user of users) {
      try {
        const anomalies = await anomalyDetectionService.detectAnomalies(
          user.employeeId,
          targetDate
        );
        results.anomalies.success.push({
          employeeId: user.employeeId,
          anomaliesDetected: anomalies.length,
        });
        results.anomalies.totalDetected += anomalies.length;

        if (anomalies.length > 0) {
          console.log(
            `  ⚠️  ${user.employeeId} - ${anomalies.length} anomaly(ies) detected`
          );
        } else {
          console.log(`  ✅ ${user.employeeId} - No anomalies`);
        }
      } catch (error) {
        results.anomalies.failed.push({
          employeeId: user.employeeId,
          error: error.message,
        });
        console.error(`  ❌ ${user.employeeId} - ${error.message}`);
      }
    }

    console.log(
      `\n🔍 Total anomalies detected: ${results.anomalies.totalDetected}`
    );

    // Step 4: Send alerts for anomalies
    if (results.anomalies.totalDetected > 0) {
      console.log(`\n📧 STEP 3/3: Sending Alerts`);
      console.log('-'.repeat(60));

      const alertResults = await alertManager.sendAlertsForUnresolvedAnomalies('Medium');
      results.alerts.sent = alertResults.totalAlerts || 0;

      console.log(`  ✅ Alerts sent: ${results.alerts.sent}`);
      if (alertResults.failed && alertResults.failed.length > 0) {
        results.alerts.failed = alertResults.failed.length;
        console.log(`  ❌ Failed: ${alertResults.failed.length}`);
      }
    } else {
      console.log(`\n📧 STEP 3/3: No alerts needed (no anomalies detected)`);
    }

    // Summary
    results.endTime = new Date();
    results.duration = ((results.endTime - results.startTime) / 1000).toFixed(2);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ DAILY ANALYSIS COMPLETED`);
    console.log(`⏱️  Duration: ${results.duration}s`);
    console.log(`📊 Scores: ${results.scores.success.length}/${users.length}`);
    console.log(`🔍 Anomalies: ${results.anomalies.totalDetected}`);
    console.log(`📧 Alerts: ${results.alerts.sent}`);
    console.log(`⏰ Finished at: ${new Date().toLocaleString()}`);
    console.log(`${'='.repeat(60)}\n`);

    return results;
  } catch (error) {
    console.error(`\n❌ DAILY ANALYSIS FAILED: ${error.message}\n`);
    throw error;
  }
};

// ============================================
// Schedule Daily Analysis (Midnight)
// ============================================
exports.scheduleDailyAnalysis = () => {
  // Run every day at midnight (00:00)
  // Cron format: second minute hour day month weekday
  const cronExpression = '0 0 * * *'; // 00:00 every day

  const task = cron.schedule(cronExpression, async () => {
    console.log('\n⏰ Scheduled daily analysis triggered by cron job');
    
    try {
      await exports.runDailyAnalysis();
    } catch (error) {
      console.error('❌ Scheduled analysis failed:', error.message);
    }
  }, {
    scheduled: true,
    timezone: process.env.CRON_TIMEZONE || 'Asia/Colombo', // Default to Sri Lanka timezone
  });

  console.log('✅ Daily analysis cron job scheduled (00:00 every day)');
  console.log(`   Timezone: ${process.env.CRON_TIMEZONE || 'Asia/Colombo'}`);

  return task;
};

// ============================================
// Run Manual Analysis (Admin Trigger)
// ============================================
exports.runManualAnalysis = async (date) => {
  console.log(`\n🔧 Manual analysis triggered by admin for ${date}`);
  return await exports.runDailyAnalysis(date);
};

// ============================================
// Recalculate Scores for Date Range (Admin)
// ============================================
exports.recalculateScoresForDateRange = async (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const results = [];
  const currentDate = new Date(start);

  console.log(`\n🔄 Recalculating scores from ${start.toDateString()} to ${end.toDateString()}`);

  while (currentDate <= end) {
    console.log(`\n📅 Processing ${currentDate.toDateString()}...`);
    
    const dateResults = await aiProductivityService.recalculateScoresForDate(currentDate);
    results.push({
      date: new Date(currentDate),
      ...dateResults,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`\n✅ Recalculation complete for ${results.length} days`);
  return results;
};

// ============================================
// Get Cron Job Status
// ============================================
exports.getCronStatus = () => {
  return {
    scheduled: true,
    cronExpression: '0 0 * * *',
    description: 'Daily AI analysis at midnight',
    timezone: process.env.CRON_TIMEZONE || 'Asia/Colombo',
    nextRun: 'Midnight (00:00) every day',
  };
};

module.exports = exports;
