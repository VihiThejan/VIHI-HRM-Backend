import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
  employeeId: mongoose.Types.ObjectId;
  date: Date;
  checkIn: Date;
  checkOut?: Date;
  totalHours?: number;
  status: 'present' | 'absent' | 'half-day' | 'late';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema: Schema = new Schema(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    checkIn: {
      type: Date,
      required: [true, 'Check-in time is required'],
    },
    checkOut: Date,
    totalHours: {
      type: Number,
      min: 0,
      max: 24,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'half-day', 'late'],
      default: 'present',
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Compound index for unique attendance per employee per day
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

// Calculate total hours before saving
AttendanceSchema.pre('save', function (next) {
  if (this.checkIn && this.checkOut) {
    const checkOutDate = this.checkOut as Date;
    const checkInDate = this.checkIn as Date;
    const diff = checkOutDate.getTime() - checkInDate.getTime();
    this.totalHours = Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
  }
  next();
});

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);
