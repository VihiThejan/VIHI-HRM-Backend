import mongoose, { Schema, Document } from 'mongoose';

export interface IApplicant extends Document {
  jobId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  resumeUrl: string;
  coverLetter?: string;
  status: 'applied' | 'screening' | 'interview' | 'offered' | 'rejected' | 'hired';
  appliedDate: Date;
  notes?: string;
  interviewDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicantSchema: Schema = new Schema(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'JobPosting',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
    },
    resumeUrl: {
      type: String,
      required: [true, 'Resume is required'],
    },
    coverLetter: String,
    status: {
      type: String,
      enum: ['applied', 'screening', 'interview', 'offered', 'rejected', 'hired'],
      default: 'applied',
    },
    appliedDate: {
      type: Date,
      default: Date.now,
    },
    notes: String,
    interviewDate: Date,
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
ApplicantSchema.index({ jobId: 1, status: 1 });
ApplicantSchema.index({ email: 1 });

export default mongoose.model<IApplicant>('Applicant', ApplicantSchema);
