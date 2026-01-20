import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityHeartbeat {
  timestamp: Date;
  activityPercent: number;
  mouseMovements: number;
  isIdle: boolean;
  activeSeconds: number;
}

export interface ITimeTrackingSession extends Document {
  internId: mongoose.Types.ObjectId;
  date: Date;
  sessionStart: Date;
  sessionEnd?: Date;
  totalActiveSeconds: number;
  totalIdleSeconds: number;
  totalSessionSeconds: number;
  status: 'active' | 'paused' | 'completed';
  heartbeats: IActivityHeartbeat[];
  averageActivity: number;
  totalMouseMovements: number;
  appVersion?: string;
  deviceInfo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityHeartbeatSchema: Schema = new Schema({
  timestamp: {
    type: Date,
    default: Date.now,
  },
  activityPercent: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  mouseMovements: {
    type: Number,
    min: 0,
    default: 0,
  },
  isIdle: {
    type: Boolean,
    default: false,
  },
  activeSeconds: {
    type: Number,
    min: 0,
    default: 0,
  },
}, { _id: false });

const TimeTrackingSessionSchema: Schema = new Schema(
  {
    internId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    sessionStart: {
      type: Date,
      required: true,
    },
    sessionEnd: {
      type: Date,
    },
    totalActiveSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalIdleSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSessionSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed'],
      default: 'active',
    },
    heartbeats: [ActivityHeartbeatSchema],
    averageActivity: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    totalMouseMovements: {
      type: Number,
      min: 0,
      default: 0,
    },
    appVersion: String,
    deviceInfo: String,
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
TimeTrackingSessionSchema.index({ internId: 1, date: 1 });
TimeTrackingSessionSchema.index({ internId: 1, status: 1 });

// Calculate average activity on save
TimeTrackingSessionSchema.pre('save', function (this: ITimeTrackingSession, next) {
  if (this.heartbeats && this.heartbeats.length > 0) {
    const totalActivity = this.heartbeats.reduce(
      (sum: number, hb: IActivityHeartbeat) => sum + hb.activityPercent,
      0
    );
    this.averageActivity = Math.round(totalActivity / this.heartbeats.length);
    
    this.totalMouseMovements = this.heartbeats.reduce(
      (sum: number, hb: IActivityHeartbeat) => sum + hb.mouseMovements,
      0
    );
  }
  next();
});

// Virtual for formatted duration
TimeTrackingSessionSchema.virtual('formattedActiveTime').get(function (this: ITimeTrackingSession) {
  const hours = Math.floor(this.totalActiveSeconds / 3600);
  const minutes = Math.floor((this.totalActiveSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
});

// Static method to get today's sessions for an intern
TimeTrackingSessionSchema.statics.getTodaySessions = async function (internId: mongoose.Types.ObjectId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.find({
    internId,
    date: { $gte: today, $lt: tomorrow },
  }).sort({ sessionStart: -1 });
};

// Static method to get active session
TimeTrackingSessionSchema.statics.getActiveSession = async function (internId: mongoose.Types.ObjectId) {
  return this.findOne({
    internId,
    status: 'active',
  });
};

// Static method to get daily summary
TimeTrackingSessionSchema.statics.getDailySummary = async function (
  internId: mongoose.Types.ObjectId,
  date: Date
) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const sessions = await this.find({
    internId,
    date: { $gte: startOfDay, $lt: endOfDay },
    status: 'completed',
  });

  const totalActive = sessions.reduce((sum: number, s: ITimeTrackingSession) => sum + s.totalActiveSeconds, 0);
  const totalIdle = sessions.reduce((sum: number, s: ITimeTrackingSession) => sum + s.totalIdleSeconds, 0);
  const totalSession = sessions.reduce((sum: number, s: ITimeTrackingSession) => sum + s.totalSessionSeconds, 0);
  const avgActivity = sessions.length > 0
    ? sessions.reduce((sum: number, s: ITimeTrackingSession) => sum + s.averageActivity, 0) / sessions.length
    : 0;

  return {
    date: startOfDay,
    sessionsCount: sessions.length,
    totalActiveSeconds: totalActive,
    totalIdleSeconds: totalIdle,
    totalSessionSeconds: totalSession,
    averageActivity: Math.round(avgActivity),
    totalActiveHours: (totalActive / 3600).toFixed(2),
  };
};

// Static method to get weekly summary
TimeTrackingSessionSchema.statics.getWeeklySummary = async function (
  internId: mongoose.Types.ObjectId,
  weekStartDate: Date
) {
  const weekEnd = new Date(weekStartDate);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const sessions = await this.find({
    internId,
    date: { $gte: weekStartDate, $lt: weekEnd },
    status: 'completed',
  });

  const dailyData: { [key: string]: any } = {};
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStartDate);
    day.setDate(day.getDate() + i);
    const dayKey = day.toISOString().split('T')[0];
    dailyData[dayKey] = {
      date: day,
      totalActiveSeconds: 0,
      sessionsCount: 0,
      averageActivity: 0,
    };
  }

  sessions.forEach((session: ITimeTrackingSession) => {
    const dayKey = new Date(session.date).toISOString().split('T')[0];
    if (dailyData[dayKey]) {
      dailyData[dayKey].totalActiveSeconds += session.totalActiveSeconds;
      dailyData[dayKey].sessionsCount += 1;
      dailyData[dayKey].averageActivity = 
        (dailyData[dayKey].averageActivity * (dailyData[dayKey].sessionsCount - 1) + session.averageActivity) 
        / dailyData[dayKey].sessionsCount;
    }
  });

  const totalActive = sessions.reduce((sum: number, s: ITimeTrackingSession) => sum + s.totalActiveSeconds, 0);

  return {
    weekStartDate,
    weekEndDate: weekEnd,
    totalActiveSeconds: totalActive,
    totalActiveHours: (totalActive / 3600).toFixed(2),
    dailyBreakdown: Object.values(dailyData),
    sessionsCount: sessions.length,
  };
};

export default mongoose.model<ITimeTrackingSession>('TimeTrackingSession', TimeTrackingSessionSchema);
