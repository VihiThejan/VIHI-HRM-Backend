import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from '../models/Employee.model';

dotenv.config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vihi_hrm';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Connected');

    // Generate staff ID
    const staffId = 'VIHI001';

    // Check if admin exists by staff ID or email
    const existingAdmin = await Employee.findOne({ 
      $or: [{ email: 'admin@vihi.com' }, { staffId }] 
    });
    
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists');
      console.log('Staff ID:', existingAdmin.staffId);
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      console.log('\n💡 To login, use:');
      console.log('Staff ID:', existingAdmin.staffId);
      console.log('Password: (Use the staff ID as password if not changed)');
      process.exit(0);
    }

    // Create admin user with staff ID as password
    const admin = await Employee.create({
      name: 'System Admin',
      email: 'admin@vihi.com',
      password: staffId, // Staff ID is the initial password
      phone: '+1234567890',
      address: '123 Admin Street',
      department: 'IT',
      position: 'System Administrator',
      salary: 100000,
      staffId: staffId,
      role: 'admin',
      status: 'active',
      passwordResetRequired: true, // Force password change on first login
    });

    console.log('✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Staff ID: ', staffId);
    console.log('Password: ', staffId, '(same as Staff ID)');
    console.log('Email:    ', admin.email);
    console.log('Role:     ', admin.role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔐 Login Instructions:');
    console.log('1. Use Staff ID:', staffId);
    console.log('2. Use Password:', staffId);
    console.log('3. You will be required to change your password on first login');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();
