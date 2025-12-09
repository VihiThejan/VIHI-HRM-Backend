import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from '../models/Employee.model';

dotenv.config();

const resetAdminPassword = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vihi_hrm';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Connected');

    // Find admin by email
    const admin = await Employee.findOne({ email: 'admin@vihi.com' });
    
    if (!admin) {
      console.log('❌ Admin user not found');
      process.exit(1);
    }

    console.log('📋 Current Admin Details:');
    console.log('Staff ID:', admin.staffId);
    console.log('Email:', admin.email);
    console.log('Name:', admin.name);
    console.log('Role:', admin.role);
    console.log('Status:', admin.status);

    // Reset password to staff ID
    const newPassword = admin.staffId;
    admin.password = newPassword;
    admin.passwordResetRequired = false; // Allow direct login
    await admin.save();

    console.log('\n✅ Admin password has been reset!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Staff ID: ', admin.staffId);
    console.log('Password: ', newPassword);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔐 You can now login with these credentials.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
    process.exit(1);
  }
};

resetAdminPassword();
