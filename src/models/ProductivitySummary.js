/**
 * ProductivitySummary Model
 * Stores daily AI-calculated productivity scores
 * VIHI IT Solutions - Stage 4
 */

const mongoose = require('mongoose');

const productivitySummarySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    employeeId: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    // Time metrics (in seconds)
    activeTime: {
      type: Number,
      default: 0,
    },
    idleTime: {
      type: Number,
      default: 0,
    },
    totalTime: {
      type: Number,
      default: 0,
    },
    // Activity metrics
    totalMouseMoves: {
      type: Number,
      default: 0,
    },
    totalKeyPresses: {
      type: Number,
      default: 0,
    },
    totalActivityLogs: {
      type: Number,
      default: 0,
    },
    // AI-calculated score
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    // Score components
    timeRatioScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 70,
    },
    activityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 30,
    },
    // Performance category
    category: {
      type: String,
      enum: ['Excellent', 'Good', 'Needs Improvement', 'Inactive'],
      required: true,
    },
    // Additional insights
    workHoursStart: {
      type: Number, // Hour of first activity (0-23)
      default: null,
    },
    workHoursEnd: {
      type: Number, // Hour of last activity (0-23)
      default: null,
    },
    peakProductivityHour: {
      type: Number, // Most productive hour
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
productivitySummarySchema.index({ employeeId: 1, date: -1 });
productivitySummarySchema.index({ date: -1, score: -1 });

// Static method to get performance category
productivitySummarySchema.statics.getCategory = function (score) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs Improvement';
  return 'Inactive';
};

// Instance method to calculate hours worked
productivitySummarySchema.methods.getHoursWorked = function () {
  return (this.totalTime / 3600).toFixed(2);
};

// Instance method to get productivity percentage
productivitySummarySchema.methods.getProductivityPercentage = function () {
  if (this.totalTime === 0) return 0;
  return Math.round((this.activeTime / this.totalTime) * 100);
};

module.exports = mongoose.model('ProductivitySummary', productivitySummarySchema);
