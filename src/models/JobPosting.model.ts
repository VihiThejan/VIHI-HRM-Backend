import mongoose, { Schema, Document } from 'mongoose';

export interface IJobPosting extends Document {
  title: string;
  description: string;
  requirements: string[];
  department: string;
  location: string;
  salary: {
    min: number;
    max: number;
  };
  status: 'open' | 'closed' | 'on-hold';
  postedDate: Date;
  closingDate?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const JobPostingSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
    },
    requirements: [{
      type: String,
      trim: true,
    }],
    department: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    salary: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'on-hold'],
      default: 'open',
    },
    postedDate: {
      type: Date,
      default: Date.now,
    },
    closingDate: Date,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IJobPosting>('JobPosting', JobPostingSchema);
