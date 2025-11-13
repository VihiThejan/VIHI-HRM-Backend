/**
 * Activity Model - Time Tracking Schema
 * VIHI IT Solutions HR System
 */

const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    employeeId: {
      type: String,
      required: true,
      uppercase: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    activeTime: {
      type: Number, // in seconds
      default: 0,
      min: 0,
    },
    idleTime: {
      type: Number, // in seconds
      default: 0,
      min: 0,
    },
    totalTime: {
      type: Number, // in seconds (activeTime + idleTime)
      default: 0,
      min: 0,
    },
    applications: [
      {
        name: {
          type: String,
          required: true,
        },
        duration: {
          type: Number, // in seconds
          default: 0,
        },
        category: {
          type: String,
          enum: ['productive', 'neutral', 'unproductive'],
          default: 'neutral',
        },
      },
    ],
    websites: [
      {
        url: {
          type: String,
          required: true,
        },
        domain: {
          type: String,
        },
        duration: {
          type: Number, // in seconds
          default: 0,
        },
        category: {
          type: String,
          enum: ['productive', 'neutral', 'unproductive'],
          default: 'neutral',
        },
      },
    ],
    screenshots: [
      {
        timestamp: Date,
        url: String,
        description: String,
      },
    ],
    productivity: {
      score: {
        type: Number, // 0-100
        default: 0,
        min: 0,
        max: 100,
      },
      status: {
        type: String,
        enum: ['excellent', 'good', 'average', 'poor'],
        default: 'average',
      },
    },
    deviceInfo: {
      hostname: String,
      os: String,
      ipAddress: String,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES for faster queries
// ============================================
activitySchema.index({ user: 1, date: -1 });
activitySchema.index({ employeeId: 1, date: -1 });
activitySchema.index({ date: -1 });

// ============================================
// METHODS: Calculate productivity score
// ============================================
activitySchema.methods.calculateProductivity = function () {
  if (this.totalTime === 0) return 0;

  const productiveAppTime = this.applications
    .filter((app) => app.category === 'productive')
    .reduce((sum, app) => sum + app.duration, 0);

  const productiveWebTime = this.websites
    .filter((web) => web.category === 'productive')
    .reduce((sum, web) => sum + web.duration, 0);

  const totalProductiveTime = productiveAppTime + productiveWebTime;
  const score = Math.round((totalProductiveTime / this.totalTime) * 100);

  this.productivity.score = Math.min(score, 100);
  
  // Set status based on score
  if (score >= 80) this.productivity.status = 'excellent';
  else if (score >= 60) this.productivity.status = 'good';
  else if (score >= 40) this.productivity.status = 'average';
  else this.productivity.status = 'poor';

  return this.productivity.score;
};

// ============================================
// PRE-SAVE: Auto-calculate total time
// ============================================
activitySchema.pre('save', function (next) {
  this.totalTime = this.activeTime + this.idleTime;
  next();
});

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;
