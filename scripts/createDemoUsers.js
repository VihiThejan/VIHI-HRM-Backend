/**
 * Create Demo Users Script
 * 
 * This script creates demo admin and employee accounts for testing.
 * Run this once before first login.
 * 
 * Usage:
 *   node scripts/createDemoUsers.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('../src/models/User');

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    // Support both MONGO_URI and MONGODB_URI
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MongoDB URI not found. Please set MONGO_URI or MONGODB_URI in .env file');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    process.exit(1);
  }
};

/**
 * Create demo users
 */
const createDemoUsers = async () => {
  try {
    console.log('\n🚀 Creating demo users...\n');

    // Demo users data
    const demoUsers = [
      {
        email: 'admin@vihi.ai',
        password: 'admin123',
        name: 'Admin User',
        role: 'admin',
        employeeId: 'ADMIN001',
        department: 'Technology',
        position: 'System Administrator',
        isActive: true,
      },
      {
        email: 'employee@vihi.ai',
        password: 'employee123',
        name: 'John Doe',
        employeeId: 'EMP001',
        department: 'Technology',
        position: 'Software Engineer',
        role: 'employee',
        isActive: true,
      },
    ];

    // Create or update each user
    for (const userData of demoUsers) {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Upsert user
      const user = await User.findOneAndUpdate(
        { email: userData.email },
        {
          ...userData,
          password: hashedPassword,
        },
        { upsert: true, new: true }
      );

      console.log(`✅ Created/Updated: ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      if (user.employeeId) {
        console.log(`   Employee ID: ${user.employeeId}`);
        console.log(`   Department: ${user.department}`);
      }
      console.log('');
    }

    console.log('🎉 Demo users created successfully!\n');
    console.log('📋 Login Credentials:\n');
    console.log('Admin Account:');
    console.log('  Email: admin@vihi.ai');
    console.log('  Password: admin123\n');
    console.log('Employee Account:');
    console.log('  Email: employee@vihi.ai');
    console.log('  Password: employee123\n');
    console.log('🌐 Login URL: http://localhost:3000/login\n');

  } catch (error) {
    console.error('❌ Error creating demo users:', error.message);
    throw error;
  }
};

/**
 * Main execution
 */
const main = async () => {
  try {
    await connectDB();
    await createDemoUsers();
    process.exit(0);
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
};

// Run script
main();
