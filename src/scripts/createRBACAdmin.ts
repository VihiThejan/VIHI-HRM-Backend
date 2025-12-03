import dotenv from 'dotenv';
import { connectDB } from '../config/database';
import { logger } from '../config/logger';
import User from '../models/User.model';
import Role from '../models/Role.model';

dotenv.config();

const createRBACAdmin = async () => {
  try {
    logger.info('🔄 Creating RBAC admin user...');

    await connectDB();

    // Find the Super Admin role
    const superAdminRole = await Role.findOne({ name: 'Super Admin' });
    if (!superAdminRole) {
      logger.error('❌ Super Admin role not found. Server must be running to seed roles first.');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'admin@vihi.com' });
    if (existingUser) {
      logger.info('ℹ️  RBAC admin user already exists');
      logger.info(`   Email: ${existingUser.email}`);
      logger.info(`   Roles: ${existingUser.roleIds.length}`);
      process.exit(0);
    }

    // Create new RBAC admin user
    const user = await User.create({
      name: 'System Admin',
      email: 'admin@vihi.com',
      password: 'admin123', // Will be hashed automatically
      roleIds: [superAdminRole._id],
      status: 'active',
    });

    logger.info('✅ Successfully created RBAC admin user');
    logger.info(`   Email: ${user.email}`);
    logger.info(`   Password: admin123`);
    logger.info(`   Role: Super Admin`);
    logger.info(`   User ID: ${user._id}`);
    logger.info('');
    logger.info('🎉 You can now login with these credentials!');

    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Failed to create admin user:', error);
    process.exit(1);
  }
};

// Run script
createRBACAdmin();
