import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IEmployee extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  department: string;
  position: string;
  salary: number;
  staffId?: string;
  nic?: string;
  passportNo?: string;
  joinDate: Date;
  status: 'active' | 'inactive' | 'on-leave';
  role: 'admin' | 'ceo' | 'manager' | 'employee' | 'intern';
  passwordResetRequired: boolean;
  avatar?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const EmployeeSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
    },
    address: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
    },
    position: {
      type: String,
      required: [true, 'Position is required'],
    },
    salary: {
      type: Number,
      required: false,
      min: 0,
    },
    staffId: {
      type: String,
      unique: true,
      sparse: true,
    },
    nic: {
      type: String,
      trim: true,
    },
    passportNo: {
      type: String,
      trim: true,
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'on-leave'],
      default: 'active',
    },
    role: {
      type: String,
      enum: ['admin', 'ceo', 'manager', 'employee', 'intern'],
      default: 'employee',
    },
    passwordResetRequired: {
      type: Boolean,
      default: false,
    },
    avatar: String,
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
EmployeeSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password as string, salt);
  next();
});

// Compare password method
EmployeeSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IEmployee>('Employee', EmployeeSchema);
