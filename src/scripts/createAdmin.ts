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

    // Check if admin exists
    const existingAdmin = await Employee.findOne({ email: 'admin@vihi.com' });
    
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      process.exit(0);
    }

    // Create admin user
    const admin = await Employee.create({
      name: 'System Admin',
      email: 'admin@vihi.com',
      password: 'admin123',
      phone: '+1234567890',
      address: '123 Admin Street',
      department: 'IT',
      position: 'System Administrator',
      salary: 100000,
      role: 'admin',
      status: 'active',
    });

    console.log('✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:    admin@vihi.com');
    console.log('Password: admin123');
    console.log('Role:     admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nYou can now login with these credentials.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();
