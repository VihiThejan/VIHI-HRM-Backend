/**
 * Alert Manager
 * Sends Slack and email notifications for anomaly alerts
 * VIHI IT Solutions - Stage 4
 */

const nodemailer = require('nodemailer');
const Anomaly = require('../models/Anomaly');

// ============================================
// CONFIGURATION
// ============================================
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';
const EMAIL_CONFIG = {
  service: process.env.EMAIL_SERVICE || 'gmail',
  user: process.env.ALERT_EMAIL_FROM || '',
  pass: process.env.ALERT_EMAIL_PASS || '',
  to: process.env.ALERT_EMAIL_TO || '',
};

// Emoji mappings for severity
const SEVERITY_EMOJI = {
  Critical: '🚨',
  High: '⚠️',
  Medium: '⚡',
  Low: 'ℹ️',
};

// Color mappings for severity
const SEVERITY_COLORS = {
  Critical: '#FF0000', // Red
  High: '#FF6B00', // Orange
  Medium: '#FFD700', // Yellow
  Low: '#36A2EB', // Blue
};

// ============================================
// Initialize Email Transporter
// ============================================
let emailTransporter = null;

const initializeEmailTransporter = () => {
  if (!EMAIL_CONFIG.user || !EMAIL_CONFIG.pass) {
    console.warn('⚠️ Email configuration missing - email alerts disabled');
    return null;
  }

  try {
    emailTransporter = nodemailer.createTransport({
      service: EMAIL_CONFIG.service,
      auth: {
        user: EMAIL_CONFIG.user,
        pass: EMAIL_CONFIG.pass,
      },
    });

    console.log('✅ Email transporter initialized');
    return emailTransporter;
  } catch (error) {
    console.error('❌ Failed to initialize email transporter:', error.message);
    return null;
  }
};

// ============================================
// Send Slack Alert
// ============================================
exports.sendSlackAlert = async (anomaly) => {
  if (!SLACK_WEBHOOK_URL) {
    console.warn('⚠️ Slack webhook URL not configured - skipping Slack alert');
    return { success: false, message: 'Slack webhook not configured' };
  }

  try {
    const emoji = SEVERITY_EMOJI[anomaly.severity] || '📊';
    const color = SEVERITY_COLORS[anomaly.severity] || '#808080';

    // Format date
    const dateStr = new Date(anomaly.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Build Slack message payload
    const payload = {
      text: `${emoji} *Productivity Anomaly Alert*`,
      attachments: [
        {
          color: color,
          fields: [
            {
              title: 'Employee',
              value: anomaly.user?.name || 'Unknown',
              short: true,
            },
            {
              title: 'Employee ID',
              value: anomaly.employeeId,
              short: true,
            },
            {
              title: 'Department',
              value: anomaly.user?.department || 'N/A',
              short: true,
            },
            {
              title: 'Date',
              value: dateStr,
              short: true,
            },
            {
              title: 'Anomaly Type',
              value: anomaly.type,
              short: true,
            },
            {
              title: 'Severity',
              value: `${emoji} ${anomaly.severity}`,
              short: true,
            },
            {
              title: 'Deviation',
              value: `${anomaly.deviationPercent}%`,
              short: true,
            },
            {
              title: 'Details',
              value: anomaly.description,
              short: false,
            },
          ],
          footer: 'VIHI IT Solutions - HR Time Tracking',
          footer_icon: 'https://vihi.ai/favicon.ico',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    // Send to Slack
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }

    console.log(`✅ Slack alert sent for anomaly ${anomaly._id}`);
    return { success: true, channel: 'slack' };
  } catch (error) {
    console.error('❌ Failed to send Slack alert:', error.message);
    return { success: false, message: error.message };
  }
};

// ============================================
// Send Email Alert
// ============================================
exports.sendEmailAlert = async (anomaly) => {
  if (!emailTransporter) {
    emailTransporter = initializeEmailTransporter();
  }

  if (!emailTransporter) {
    console.warn('⚠️ Email transporter not available - skipping email alert');
    return { success: false, message: 'Email transporter not configured' };
  }

  try {
    const emoji = SEVERITY_EMOJI[anomaly.severity] || '📊';
    const dateStr = new Date(anomaly.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Email subject
    const subject = `${emoji} Productivity Anomaly Alert - ${anomaly.user?.name || 'Employee'} (${anomaly.severity})`;

    // Email HTML body
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .alert-box { background: white; border-left: 4px solid ${SEVERITY_COLORS[anomaly.severity]}; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .detail-label { font-weight: bold; color: #555; }
          .detail-value { color: #333; }
          .severity-badge { display: inline-block; padding: 5px 15px; background: ${SEVERITY_COLORS[anomaly.severity]}; color: white; border-radius: 20px; font-weight: bold; }
          .description { background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #ffc107; }
          .footer { text-align: center; color: #777; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${emoji} Productivity Anomaly Detected</h1>
            <p style="margin: 10px 0 0 0;">VIHI IT Solutions - HR Time Tracking System</p>
          </div>
          
          <div class="content">
            <div class="alert-box">
              <h2 style="margin-top: 0; color: #333;">Alert Details</h2>
              
              <div class="detail-row">
                <span class="detail-label">Employee:</span>
                <span class="detail-value">${anomaly.user?.name || 'Unknown'}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Employee ID:</span>
                <span class="detail-value">${anomaly.employeeId}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Department:</span>
                <span class="detail-value">${anomaly.user?.department || 'N/A'}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Position:</span>
                <span class="detail-value">${anomaly.user?.position || 'N/A'}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${dateStr}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Anomaly Type:</span>
                <span class="detail-value"><strong>${anomaly.type}</strong></span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Severity:</span>
                <span class="detail-value"><span class="severity-badge">${anomaly.severity}</span></span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Deviation:</span>
                <span class="detail-value"><strong>${anomaly.deviationPercent}%</strong></span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Actual Value:</span>
                <span class="detail-value">${anomaly.actualValue}</span>
              </div>
              
              <div class="detail-row" style="border-bottom: none;">
                <span class="detail-label">Expected Value:</span>
                <span class="detail-value">${anomaly.expectedValue}</span>
              </div>
            </div>
            
            <div class="description">
              <strong>📋 Description:</strong><br>
              ${anomaly.description}
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/admin" 
                 style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                View Dashboard
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an automated alert from the VIHI HR Time Tracking System.</p>
            <p>Please review the anomaly in the admin dashboard and take appropriate action.</p>
            <p style="font-size: 12px; color: #999;">© 2025 VIHI IT Solutions. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Plain text fallback
    const textBody = `
${emoji} PRODUCTIVITY ANOMALY ALERT

Employee: ${anomaly.user?.name || 'Unknown'} (${anomaly.employeeId})
Department: ${anomaly.user?.department || 'N/A'}
Date: ${dateStr}

Anomaly Type: ${anomaly.type}
Severity: ${anomaly.severity}
Deviation: ${anomaly.deviationPercent}%

Actual Value: ${anomaly.actualValue}
Expected Value: ${anomaly.expectedValue}

Description:
${anomaly.description}

Please review this anomaly in the admin dashboard and take appropriate action.

Dashboard: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/admin

---
VIHI IT Solutions - HR Time Tracking System
    `;

    // Send email
    const mailOptions = {
      from: `"VIHI HR Alerts" <${EMAIL_CONFIG.user}>`,
      to: EMAIL_CONFIG.to,
      subject: subject,
      text: textBody,
      html: htmlBody,
    };

    await emailTransporter.sendMail(mailOptions);

    console.log(`✅ Email alert sent for anomaly ${anomaly._id}`);
    return { success: true, channel: 'email' };
  } catch (error) {
    console.error('❌ Failed to send email alert:', error.message);
    return { success: false, message: error.message };
  }
};

// ============================================
// Send Alert (Both Slack and Email)
// ============================================
exports.sendAlert = async (anomalyId) => {
  const anomaly = await Anomaly.findById(anomalyId).populate(
    'user',
    'name email employeeId department position'
  );

  if (!anomaly) {
    throw new Error('Anomaly not found');
  }

  if (anomaly.alertSent) {
    console.log(`⚠️ Alert already sent for anomaly ${anomalyId}`);
    return { alreadySent: true };
  }

  const results = {
    slack: null,
    email: null,
    channels: [],
  };

  // Send Slack alert
  const slackResult = await this.sendSlackAlert(anomaly);
  results.slack = slackResult;
  if (slackResult.success) {
    results.channels.push('slack');
  }

  // Send email alert
  const emailResult = await this.sendEmailAlert(anomaly);
  results.email = emailResult;
  if (emailResult.success) {
    results.channels.push('email');
  }

  // Record alert in database
  if (results.channels.length > 0) {
    anomaly.recordAlert(results.channels);
    await anomaly.save();
  }

  return results;
};

// ============================================
// Send Batch Alerts
// ============================================
exports.sendBatchAlerts = async (anomalyIds) => {
  const results = {
    success: [],
    failed: [],
    totalSent: 0,
  };

  for (const anomalyId of anomalyIds) {
    try {
      const result = await this.sendAlert(anomalyId);
      if (!result.alreadySent) {
        results.success.push({
          anomalyId,
          channels: result.channels,
        });
        results.totalSent += result.channels.length;
      }
    } catch (error) {
      results.failed.push({
        anomalyId,
        error: error.message,
      });
    }
  }

  return results;
};

// ============================================
// Send Alerts for Unresolved Anomalies
// ============================================
exports.sendAlertsForUnresolvedAnomalies = async (minSeverity = 'Medium') => {
  const severityOrder = { Low: 1, Medium: 2, High: 3, Critical: 4 };
  const minSeverityLevel = severityOrder[minSeverity] || 2;

  // Find unresolved anomalies without alerts
  const anomalies = await Anomaly.find({
    resolved: false,
    alertSent: false,
  }).lean();

  // Filter by severity
  const filteredAnomalies = anomalies.filter(
    (a) => severityOrder[a.severity] >= minSeverityLevel
  );

  if (filteredAnomalies.length === 0) {
    console.log('✅ No new anomalies to alert');
    return { totalAlerts: 0 };
  }

  const anomalyIds = filteredAnomalies.map((a) => a._id.toString());
  return await this.sendBatchAlerts(anomalyIds);
};

// ============================================
// Test Alert System
// ============================================
exports.testAlerts = async () => {
  console.log('🧪 Testing alert system...');

  const testResults = {
    slack: { configured: false, tested: false, success: false },
    email: { configured: false, tested: false, success: false },
  };

  // Test Slack
  if (SLACK_WEBHOOK_URL) {
    testResults.slack.configured = true;
    testResults.slack.tested = true;

    const testPayload = {
      text: '🧪 *Test Alert* - VIHI HR Time Tracking System',
      attachments: [
        {
          color: '#36A2EB',
          text: 'This is a test alert to verify Slack integration is working correctly.',
          footer: 'VIHI IT Solutions',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    try {
      const response = await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });

      testResults.slack.success = response.ok;
    } catch (error) {
      testResults.slack.error = error.message;
    }
  }

  // Test Email
  if (EMAIL_CONFIG.user && EMAIL_CONFIG.pass) {
    testResults.email.configured = true;
    testResults.email.tested = true;

    if (!emailTransporter) {
      emailTransporter = initializeEmailTransporter();
    }

    try {
      await emailTransporter.sendMail({
        from: `"VIHI HR Alerts" <${EMAIL_CONFIG.user}>`,
        to: EMAIL_CONFIG.to,
        subject: '🧪 Test Alert - VIHI HR Time Tracking',
        text: 'This is a test email to verify the alert system is working correctly.',
        html: '<p>This is a test email to verify the alert system is working correctly.</p>',
      });

      testResults.email.success = true;
    } catch (error) {
      testResults.email.error = error.message;
    }
  }

  return testResults;
};

module.exports = exports;
