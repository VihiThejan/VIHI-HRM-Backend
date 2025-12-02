import mongoose, { Schema, Document } from 'mongoose';

export interface IPerformance extends Document {
  employeeId: mongoose.Types.ObjectId;
  reviewerId: mongoose.Types.ObjectId;
  period: string;
  goals: string[];
  achievements: string[];
  rating: number;
  comments: string;
  strengths: string[];
  improvements: string[];
  createdAt: Date;
  updatedAt: Date;
}

const PerformanceSchema: Schema = new Schema(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    period: {
      type: String,
      required: [true, 'Review period is required'],
    },
    goals: [{
      type: String,
      trim: true,
    }],
    achievements: [{
      type: String,
      trim: true,
    }],
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5,
    },
    comments: {
      type: String,
      required: true,
      trim: true,
    },
    strengths: [{
      type: String,
      trim: true,
    }],
    improvements: [{
      type: String,
      trim: true,
    }],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
PerformanceSchema.index({ employeeId: 1, period: 1 });

export default mongoose.model<IPerformance>('Performance', PerformanceSchema);
