import mongoose, { Schema, Document } from 'mongoose';

export interface IInternTask {
  date: Date;
  description: string;
  hours: number;
}

export interface IInternTimeTracking extends Document {
  internId: mongoose.Types.ObjectId;
  weekStartDate: Date;
  weekEndDate: Date;
  totalHours: number;
  tasks: IInternTask[];
  aiGeneratedDiary?: string;
  aiGeneratedFeedback?: string;
  ceoComments?: string;
  supervisorComments?: string;
  diaryGenerated: boolean;
  diaryUrl?: string;
  status: 'active' | 'completed' | 'submitted';
  createdAt: Date;
  updatedAt: Date;
}

const InternTaskSchema: Schema = new Schema({
  date: {
    type: Date,
    required: true,
  },
  description: {
    type: String,
    required: [true, 'Task description is required'],
    trim: true,
  },
  hours: {
    type: Number,
    required: [true, 'Hours are required'],
    min: 0,
    max: 24,
  },
}, { _id: false });

const InternTimeTrackingSchema: Schema = new Schema(
  {
    internId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    weekStartDate: {
      type: Date,
      required: true,
    },
    weekEndDate: {
      type: Date,
      required: true,
    },
    totalHours: {
      type: Number,
      default: 0,
      min: 0,
      max: 40,
    },
    tasks: [InternTaskSchema],
    aiGeneratedDiary: {
      type: String,
      trim: true,
    },
    aiGeneratedFeedback: {
      type: String,
      trim: true,
    },
    ceoComments: {
      type: String,
      trim: true,
    },
    supervisorComments: {
      type: String,
      trim: true,
    },
    diaryGenerated: {
      type: Boolean,
      default: false,
    },
    diaryUrl: String,
    status: {
      type: String,
      enum: ['active', 'completed', 'submitted'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique tracking per intern per week
InternTimeTrackingSchema.index({ internId: 1, weekStartDate: 1 }, { unique: true });

// Calculate total hours before saving
InternTimeTrackingSchema.pre('save', function (next) {
  if (this.tasks && (this.tasks as any).length > 0) {
    this.totalHours = (this.tasks as any).reduce((sum: number, task: any) => sum + task.hours, 0);
  }
  next();
});

// Validation: total hours should not exceed 40
InternTimeTrackingSchema.pre('save', function (next) {
  if ((this.totalHours as number) > 40) {
    return next(new Error('Total hours cannot exceed 40 hours per week'));
  }
  next();
});

export default mongoose.model<IInternTimeTracking>('InternTimeTracking', InternTimeTrackingSchema);
