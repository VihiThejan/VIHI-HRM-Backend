import mongoose from 'mongoose';
import Employee from '../models/Employee.model';
import { connectDB } from '../config/database';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function fixInternRoles() {
  try {
    // Connect to database
    await connectDB();
    
    console.log('🔍 Searching for interns with incorrect roles...');
    
    // Find all employees with position 'Intern' but role not 'intern'
    const internsToFix = await Employee.find({
      position: 'Intern',
      role: { $ne: 'intern' }
    });
    
    console.log(`Found ${internsToFix.length} intern(s) to fix`);
    
    if (internsToFix.length === 0) {
      console.log('✅ All interns already have correct roles!');
      process.exit(0);
    }
    
    // Update each intern
    for (const intern of internsToFix) {
      console.log(`Updating ${intern.name} (${intern.staffId}) - Current role: ${intern.role}`);
      
      await Employee.findByIdAndUpdate(intern._id, {
        role: 'intern'
      });
      
      console.log(`✅ Updated ${intern.name} to role: intern`);
    }
    
    console.log(`\n✅ Successfully updated ${internsToFix.length} intern(s)`);
    console.log('🔄 Interns should log out and log back in to see the Diary menu');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing intern roles:', error);
    process.exit(1);
  }
}

// Run the fix
fixInternRoles();
