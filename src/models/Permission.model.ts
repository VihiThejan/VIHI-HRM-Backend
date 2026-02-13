import mongoose, { Document, Schema } from 'mongoose';

// Export enums for use in other parts of the application
export const PERMISSION_MODULES = [
  'dashboard',
  'employees',
  'recruitment',
  'leaves',
  'attendance',
  'payroll',
  'performance',
  'interns',
  'diary',
  'diary_review',
  'admin',
] as const;

export const PERMISSION_ACTIONS = [
  'view',
  'create',
  'update',
  'delete',
  'approve',
  'reject',
  'manage',
  'run',
  'comment',
  'export',
  'import',
  'review',
] as const;

export type PermissionModule = typeof PERMISSION_MODULES[number];
export type PermissionAction = typeof PERMISSION_ACTIONS[number];

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
      enum: PERMISSION_MODULES,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: PERMISSION_ACTIONS,
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
