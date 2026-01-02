import mongoose, { Document, Schema } from 'mongoose';

export interface IPermission extends Document {
  key: string;
  module: string;
  action: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const permissionSchema = new Schema<IPermission>(
  {
    key: {
      type: String,
      required: [true, 'Permission key is required'],
      unique: true,
      trim: true,
      index: true,
    },
    module: {
      type: String,
      required: [true, 'Module is required'],
      enum: [
        'dashboard',
        'employees',
        'recruitment',
        'leaves',
        'attendance',
        'payroll',
        'performance',
        'interns',
        'admin',
      ],
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: ['view', 'create', 'update', 'delete', 'approve', 'reject', 'manage', 'run', 'comment', 'export', 'import', 'review'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for efficient queries
permissionSchema.index({ module: 1, action: 1 });

const Permission = mongoose.model<IPermission>('Permission', permissionSchema);

export default Permission;
