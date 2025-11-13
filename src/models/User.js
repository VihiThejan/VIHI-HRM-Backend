/**
 * User Model - Employee/Admin Schema
 * VIHI IT Solutions HR System
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['admin', 'employee', 'manager'],
      default: 'employee',
    },
    employeeId: {
      type: String,
      required: function() {
        return this.role === 'employee' || this.role === 'manager';
      },
      unique: true,
      sparse: true, // Allow null values for unique index
      uppercase: true,
    },
    department: {
      type: String,
      enum: ['Technology', 'Marketing', 'Design', 'HR', 'Finance', 'Operations'],
      default: 'Technology',
    },
    position: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    profileImage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// ============================================
// MIDDLEWARE: Hash password before saving
// ============================================
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ============================================
// METHODS: Compare password
// ============================================
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ============================================
// METHODS: Get public profile
// ============================================
userSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    employeeId: this.employeeId,
    department: this.department,
    position: this.position,
    isActive: this.isActive,
    profileImage: this.profileImage,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
