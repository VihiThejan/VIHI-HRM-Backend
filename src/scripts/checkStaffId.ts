import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Employee from '../models/Employee.model';
import User from '../models/User.model';
import { logger } from '../config/logger';

// Load environment variables
dotenv.config();

const checkStaffId = async (staffId: string) => {
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
    const employee = await Employee.findOne({ staffId }).select('+password');

    if (!employee) {
      console.log(`❌ No employee found with staffId: ${staffId}`);
      
      // List all employees
      console.log('\n📋 Available employees:');
      const employees = await Employee.find({}).select('staffId name email status');
      employees.forEach(emp => {
        console.log(`  - ${emp.staffId} | ${emp.name} | ${emp.email} | Status: ${emp.status}`);
      });
    } else {
      console.log(`✅ Employee found:`);
      console.log(`  - Staff ID: ${employee.staffId}`);
      console.log(`  - Name: ${employee.name}`);
      console.log(`  - Email: ${employee.email}`);
      console.log(`  - Status: ${employee.status}`);
      console.log(`  - Role: ${employee.role}`);
      console.log(`  - Department: ${employee.department}`);
      console.log(`  - Position: ${employee.position}`);
      console.log(`  - Password Reset Required: ${employee.passwordResetRequired}`);
      console.log(`  - Has Password: ${!!employee.password}`);

      // Check for associated User (RBAC)
      const user = await User.findOne({ employeeId: employee._id });
      if (user) {
        console.log(`\n✅ Associated RBAC User found:`);
        console.log(`  - User ID: ${user._id}`);
        console.log(`  - Status: ${user.status}`);
        console.log(`  - Role IDs: ${user.roleIds.join(', ')}`);
        console.log(`  - Last Login: ${user.lastLogin || 'Never'}`);
      } else {
        console.log(`\n⚠️  No RBAC User found (will use legacy role: ${employee.role})`);
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

// Get staff ID from command line argument
const staffId = process.argv[2];

if (!staffId) {
  console.log('Usage: npm run check:staff -- <staffId>');
  console.log('Example: npm run check:staff -- IT402153894');
  process.exit(1);
}

checkStaffId(staffId);
