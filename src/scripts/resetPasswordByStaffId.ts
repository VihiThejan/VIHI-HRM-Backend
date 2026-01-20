import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Employee from '../models/Employee.model';
import { logger } from '../config/logger';

// Load environment variables
dotenv.config();

const resetPassword = async (staffId: string, newPassword: string) => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
    
    if (!mongoUri) {
      console.error('❌ MONGODB_URI or MONGO_URI not found in environment variables');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find employee by staff ID
    const employee = await Employee.findOne({ staffId });

    if (!employee) {
      console.log(`❌ No employee found with staffId: ${staffId}`);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`✅ Employee found: ${employee.name} (${employee.email})`);
    console.log(`📝 Resetting password...`);

    // Update password (will be hashed by the pre-save hook)
    employee.password = newPassword;
    employee.passwordResetRequired = false;
    await employee.save();

    console.log(`✅ Password reset successfully!`);
    console.log(`\n📋 Login Credentials:`);
    console.log(`   Staff ID: ${staffId}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`\n⚠️  Please change this password after first login!`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

// Get arguments
const staffId = process.argv[2];
const newPassword = process.argv[3];

if (!staffId || !newPassword) {
  console.log('Usage: npm run reset:password -- <staffId> <newPassword>');
  console.log('Example: npm run reset:password -- IT402153894 NewPassword123');
  console.log('\n⚠️  Important: Use a strong password!');
  process.exit(1);
}

resetPassword(staffId, newPassword);
