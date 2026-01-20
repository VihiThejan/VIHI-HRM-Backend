import mongoose, { Document, Schema } from 'mongoose';

export interface ITask {
  description: string;
  completionStatus: 'completed' | 'in-progress' | 'pending';
  timeSpent?: number; // in hours
  learningOutcomes?: string;
}

export interface IDiaryEntry extends Document {
  internId: mongoose.Types.ObjectId;
  weekStartDate: Date; // Monday of the week
  weekEndDate: Date; // Friday of the week
  weekNumber: number; // Week number in the internship
  entries: {
    date: Date; // Specific day (Mon-Fri)
    dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
    tasks: ITask[];
    generatedEntry: string; // AI-generated diary entry
    status: 'draft' | 'submitted' | 'edited';
    submittedAt?: Date;
  }[];
  weeklyStatus: 'in-progress' | 'submitted-for-feedback' | 'feedback-generated' | 'signed' | 'completed';
  submittedForFeedbackAt?: Date;
  generatedFeedback?: string; // AI-generated supervisor feedback
  feedbackGeneratedAt?: Date;
  supervisorComments?: string;
  supervisorSignature?: {
    signedBy: mongoose.Types.ObjectId;
    signedAt: Date;
    signatureUrl: string; // Digital signature image URL
    documentUrl: string; // Final signed PDF URL
  };
  downloadedByIntern: boolean;
  downloadedAt?: Date;
  internSubmissionUrl?: string; // Uploaded by intern
  internSubmissionDate?: Date;
  googleDriveFolderId?: string; // Week folder ID in Google Drive
  signedDocumentDriveId?: string; // Signed PDF file ID in Google Drive
  signedDocumentDriveLink?: string; // Web view link for signed document
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>({
  description: {
    type: String,
    required: true,
    trim: true
  },
  completionStatus: {
    type: String,
    enum: ['completed', 'in-progress', 'pending'],
    default: 'completed'
  },
  timeSpent: {
    type: Number,
    min: 0,
    max: 24
  },
  learningOutcomes: {
    type: String,
    trim: true
  }
}, { _id: false });

const DiaryEntrySchema = new Schema<IDiaryEntry>({
  internId: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  weekStartDate: {
    type: Date,
    required: true,
    index: true
  },
  weekEndDate: {
    type: Date,
    required: true
  },
  weekNumber: {
    type: Number,
    required: true,
    min: 1
  },
  entries: [{
    date: {
      type: Date,
      required: true
    },
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      required: true
    },
    tasks: [TaskSchema],
    generatedEntry: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'edited'],
      default: 'draft'
    },
    submittedAt: Date
  }],
  weeklyStatus: {
    type: String,
    enum: ['in-progress', 'submitted-for-feedback', 'feedback-generated', 'signed', 'completed'],
    default: 'in-progress'
  },
  submittedForFeedbackAt: Date,
  generatedFeedback: String,
  feedbackGeneratedAt: Date,
  supervisorComments: String,
  supervisorSignature: {
    signedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee'
    },
    signedAt: Date,
    signatureUrl: String,
    documentUrl: String
  },
  downloadedByIntern: {
    type: Boolean,
    default: false
  },
  downloadedAt: Date,
  internSubmissionUrl: String,
  internSubmissionDate: Date,
  googleDriveFolderId: String,
  signedDocumentDriveId: String,
  signedDocumentDriveLink: String
}, {
  timestamps: true
});

// Compound index for efficient querying
DiaryEntrySchema.index({ internId: 1, weekStartDate: 1 }, { unique: true });
DiaryEntrySchema.index({ weeklyStatus: 1 });

// Method to check if all weekday entries are submitted
DiaryEntrySchema.methods.areAllEntriesSubmitted = function (): boolean {
  return this.entries.length === 5 && this.entries.every(entry => entry.status === 'submitted');
};

// Method to get completion percentage for the week
DiaryEntrySchema.methods.getWeekCompletionPercentage = function (): number {
  const totalDays = 5; // Monday to Friday
  const submittedDays = this.entries.filter(entry => entry.status === 'submitted').length;
  return Math.round((submittedDays / totalDays) * 100);
};

// Static method to get current week's Monday
DiaryEntrySchema.statics.getCurrentWeekMonday = function (): Date {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(today.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

// Static method to get week number in internship
DiaryEntrySchema.statics.calculateWeekNumber = async function (internId: mongoose.Types.ObjectId, weekStartDate: Date): Promise<number> {
  const count = await this.countDocuments({
    internId,
    weekStartDate: { $lt: weekStartDate }
  });
  return count + 1;
};

const DiaryEntry = mongoose.model<IDiaryEntry>('DiaryEntry', DiaryEntrySchema);

export default DiaryEntry;
