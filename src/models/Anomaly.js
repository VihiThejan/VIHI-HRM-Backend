/**
 * Anomaly Model
 * Stores detected productivity anomalies for review
 * VIHI IT Solutions - Stage 4
 */

const mongoose = require('mongoose');

const anomalySchema = new mongoose.Schema(
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
    // Anomaly classification
    type: {
      type: String,
      enum: ['Low Activity', 'Idle Spike', 'No Data', 'Late Start', 'Early End', 'Extended Idle'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      required: true,
    },
    // Metrics
    actualValue: {
      type: Number,
      required: true,
    },
    expectedValue: {
      type: Number,
      required: true,
    },
    deviationPercent: {
      type: Number,
      required: true,
    },
    // Details
    description: {
      type: String,
      required: true,
    },
    // Status tracking
    resolved: {
      type: Boolean,
      default: false,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedNotes: {
      type: String,
      default: '',
    },
    // Alert tracking
    alertSent: {
      type: Boolean,
      default: false,
    },
    alertSentAt: {
      type: Date,
      default: null,
    },
    alertChannels: {
      type: [String], // ['email', 'slack']
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
anomalySchema.index({ employeeId: 1, date: -1 });
anomalySchema.index({ resolved: 1, createdAt: -1 });
anomalySchema.index({ severity: 1, resolved: 1 });

// Static method to get severity based on deviation
anomalySchema.statics.getSeverity = function (deviationPercent, type) {
  if (type === 'No Data') return 'Critical';
  
  const absDeviation = Math.abs(deviationPercent);
  if (absDeviation >= 70) return 'Critical';
  if (absDeviation >= 50) return 'High';
  if (absDeviation >= 30) return 'Medium';
  return 'Low';
};

// Instance method to mark as resolved
anomalySchema.methods.markResolved = function (userId, notes = '') {
  this.resolved = true;
  this.resolvedBy = userId;
  this.resolvedAt = new Date();
  this.resolvedNotes = notes;
  return this.save();
};

// Instance method to record alert sent
anomalySchema.methods.recordAlert = function (channels = []) {
  this.alertSent = true;
  this.alertSentAt = new Date();
  this.alertChannels = channels;
  return this.save();
};

module.exports = mongoose.model('Anomaly', anomalySchema);
