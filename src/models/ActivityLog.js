/**
 * ActivityLog Model - Granular Activity Tracking Schema
 * For real-time event logging from Python tracker
 * VIHI IT Solutions HR System
 */

const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      uppercase: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    activeWindow: {
      type: String,
      required: [true, 'Active window title is required'],
      trim: true,
    },
    mouseMoves: {
      type: Number,
      default: 0,
      min: 0,
    },
    keyboardPresses: {
      type: Number,
      default: 0,
      min: 0,
    },
    idle: {
      type: Boolean,
      default: false,
    },
    duration: {
      type: Number, // seconds since last event
      default: 60,
      min: 0,
    },
    // Additional metadata
    windowCategory: {
      type: String,
      enum: ['productive', 'neutral', 'unproductive', 'unknown'],
      default: 'unknown',
    },
    deviceInfo: {
      hostname: String,
      os: String,
      ipAddress: String,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// ============================================
// INDEXES for faster queries
// ============================================
activityLogSchema.index({ employeeId: 1, timestamp: -1 });
activityLogSchema.index({ user: 1, timestamp: -1 });
activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ idle: 1, timestamp: -1 });

// ============================================
// METHODS: Categorize window as productive/unproductive
// ============================================
activityLogSchema.methods.categorizeWindow = function () {
  const window = this.activeWindow.toLowerCase();
  
  // Productive applications
  const productive = [
    'visual studio', 'vscode', 'pycharm', 'intellij', 'eclipse',
    'sublime', 'atom', 'notepad++', 'github', 'gitlab', 'jira',
    'slack', 'teams', 'zoom', 'excel', 'word', 'powerpoint',
    'figma', 'adobe', 'postman', 'mongodb', 'mysql'
  ];
  
  // Unproductive applications
  const unproductive = [
    'facebook', 'instagram', 'twitter', 'tiktok', 'reddit',
    'youtube', 'netflix', 'spotify', 'steam', 'game',
    'whatsapp', 'telegram'
  ];
  
  // Check if window matches productive patterns
  for (const keyword of productive) {
    if (window.includes(keyword)) {
      this.windowCategory = 'productive';
      return 'productive';
    }
  }
  
  // Check if window matches unproductive patterns
  for (const keyword of unproductive) {
    if (window.includes(keyword)) {
      this.windowCategory = 'unproductive';
      return 'unproductive';
    }
  }
  
  this.windowCategory = 'neutral';
  return 'neutral';
};

// ============================================
// STATIC: Get activity summary for a time range
// ============================================
activityLogSchema.statics.getSummary = async function (employeeId, startDate, endDate) {
  const logs = await this.find({
    employeeId,
    timestamp: {
      $gte: startDate,
      $lte: endDate,
    },
  });

  const summary = {
    totalLogs: logs.length,
    totalDuration: logs.reduce((sum, log) => sum + log.duration, 0),
    activeTime: logs.filter((log) => !log.idle).reduce((sum, log) => sum + log.duration, 0),
    idleTime: logs.filter((log) => log.idle).reduce((sum, log) => sum + log.duration, 0),
    totalMouseMoves: logs.reduce((sum, log) => sum + log.mouseMoves, 0),
    totalKeyPresses: logs.reduce((sum, log) => sum + log.keyboardPresses, 0),
    topWindows: [],
  };

  // Calculate top windows
  const windowMap = new Map();
  logs.forEach((log) => {
    const current = windowMap.get(log.activeWindow) || 0;
    windowMap.set(log.activeWindow, current + log.duration);
  });

  summary.topWindows = Array.from(windowMap.entries())
    .map(([window, duration]) => ({ window, duration }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10);

  return summary;
};

// ============================================
// PRE-SAVE: Auto-categorize window
// ============================================
activityLogSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('activeWindow')) {
    this.categorizeWindow();
  }
  next();
});

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
