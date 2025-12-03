import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/database';
import { logger } from '../config/logger';
import Employee from '../models/Employee.model';
import User from '../models/User.model';
import Role from '../models/Role.model';

dotenv.config();

const migrateAdminToRBAC = async () => {
  try {
    logger.info('🔄 Starting migration of admin users to RBAC...');

    await connectDB();

    // Find the Super Admin role
    const superAdminRole = await Role.findOne({ name: 'Super Admin' });
    if (!superAdminRole) {
      logger.error('❌ Super Admin role not found. Please run seed first.');
      process.exit(1);
    }

    // Find admin employee
    const adminEmployee = await Employee.findOne({ email: 'admin@vihi.com' });
    
    if (!adminEmployee) {
      logger.info('ℹ️  No admin employee found');
      process.exit(0);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: adminEmployee.email });
    if (existingUser) {
      logger.info('ℹ️  Admin user already exists in RBAC system');
      process.exit(0);
    }

    // Create RBAC user from employee
    const user = new User({
      name: adminEmployee.name,
      email: adminEmployee.email,
      password: adminEmployee.password, // Already hashed, so we skip the pre-save hook
      roleIds: [superAdminRole._id],
      employeeId: adminEmployee._id,
      status: 'active',
    });

    // Save without triggering password hashing (password is already hashed)
    user.isModified = () => false; // Trick to skip pre-save hook
    await user.save({ validateBeforeSave: true });

    logger.info('✅ Successfully migrated admin user to RBAC system');
    logger.info(`   Email: ${user.email}`);
    logger.info(`   Role: Super Admin`);
    logger.info(`   User ID: ${user._id}`);

    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration
migrateAdminToRBAC();
