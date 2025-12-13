import mongoose, { Schema, Document } from 'mongoose';
import Employee, { IEmployee } from './Employee.model';

// Intern-specific interface extending Employee
export interface IIntern extends IEmployee {
  universityId: string;
  supervisor: mongoose.Types.ObjectId;
  internshipStartDate: Date;
  internshipEndDate?: Date;
  weeklyHoursLimit: number;
  university: string;
  course?: string;
  academicYear?: string;
  internshipType: 'academic' | 'industrial' | 'summer';
  stipend?: number;
  evaluationCriteria?: {
    technicalSkills?: number;
    communication?: number;
    teamwork?: number;
    punctuality?: number;
    overallRating?: number;
  };
}

// Discriminator key is used to differentiate between Employee and Intern
const InternSchema = new Schema(
  {
    universityId: {
      type: String,
      required: [true, 'University ID is required for interns'],
      trim: true,
      unique: true,
    },
    supervisor: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Supervisor is required for interns'],
    },
    internshipStartDate: {
      type: Date,
      required: [true, 'Internship start date is required'],
      default: Date.now,
    },
    internshipEndDate: {
      type: Date,
    },
    weeklyHoursLimit: {
      type: Number,
      default: 40,
      min: [1, 'Weekly hours must be at least 1'],
      max: [60, 'Weekly hours cannot exceed 60'],
    },
    university: {
      type: String,
      required: [true, 'University name is required for interns'],
      trim: true,
    },
    course: {
      type: String,
      trim: true,
    },
    academicYear: {
      type: String,
      trim: true,
    },
    internshipType: {
      type: String,
      enum: ['academic', 'industrial', 'summer'],
      default: 'academic',
    },
    stipend: {
      type: Number,
      min: 0,
      default: 0,
    },
    evaluationCriteria: {
      technicalSkills: {
        type: Number,
        min: 0,
        max: 100,
      },
      communication: {
        type: Number,
        min: 0,
        max: 100,
      },
      teamwork: {
        type: Number,
        min: 0,
        max: 100,
      },
      punctuality: {
        type: Number,
        min: 0,
        max: 100,
      },
      overallRating: {
        type: Number,
        min: 0,
        max: 100,
      },
    },
  },
  {
    discriminatorKey: 'employeeType',
  }
);

// Pre-save hook to ensure role is set to 'intern'
InternSchema.pre('save', function (next) {
  if (this.isNew) {
    this.role = 'intern';
    this.position = 'Intern';
  }
  next();
});

// Create Intern model as a discriminator of Employee
const Intern = Employee.discriminator<IIntern>('Intern', InternSchema);

export default Intern;
