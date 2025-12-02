import mongoose, { Schema, Document } from 'mongoose';

export interface IPayroll extends Document {
  employeeId: mongoose.Types.ObjectId;
  month: string;
  year: number;
  baseSalary: number;
  deductions: {
    tax: number;
    insurance: number;
    lateDeductions: number;
    other: number;
  };
  bonuses: {
    performance: number;
    overtime: number;
    other: number;
  };
  netSalary: number;
  status: 'draft' | 'processed' | 'paid';
  generatedDate: Date;
  paidDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollSchema: Schema = new Schema(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    month: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    baseSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    deductions: {
      tax: { type: Number, default: 0 },
      insurance: { type: Number, default: 0 },
      lateDeductions: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    bonuses: {
      performance: { type: Number, default: 0 },
      overtime: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    netSalary: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'processed', 'paid'],
      default: 'draft',
    },
    generatedDate: {
      type: Date,
      default: Date.now,
    },
    paidDate: Date,
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Compound index for unique payroll per employee per month/year
PayrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

// Calculate net salary before saving
PayrollSchema.pre('save', function (next) {
  const deductions = this.deductions as any;
  const bonuses = this.bonuses as any;
  const baseSalary = this.baseSalary as number;
  
  const totalDeductions = 
    (deductions.tax || 0) + 
    (deductions.insurance || 0) + 
    (deductions.lateDeductions || 0) + 
    (deductions.other || 0);
  
  const totalBonuses = 
    (bonuses.performance || 0) + 
    (bonuses.overtime || 0) + 
    (bonuses.other || 0);
  
  this.netSalary = baseSalary - totalDeductions + totalBonuses;
  next();
});

export default mongoose.model<IPayroll>('Payroll', PayrollSchema);
