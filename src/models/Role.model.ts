import mongoose, { Document, Schema } from 'mongoose';

export interface IRole extends Document {
  name: string;
  description: string;
  permissionKeys: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    permissionKeys: {
      type: [String],
      default: [],
      validate: {
        validator: function (keys: string[]) {
          return keys.length > 0;
        },
        message: 'Role must have at least one permission',
      },
    },
    isSystem: {
      type: Boolean,
      default: false,
      comment: 'System roles cannot be deleted',
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
roleSchema.index({ name: 1 });

const Role = mongoose.model<IRole>('Role', roleSchema);

export default Role;
