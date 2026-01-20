/**
 * Sync Employees to Users Script
 * 
 * This script:
 * 1. Creates User records for all employees who don't have one
 * 2. Updates existing User records to match employee role changes
 * 
 * Run with: npx ts-node --project tsconfig.json src/scripts/syncEmployeesToUsers.ts
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Map old role names to new RBAC role names
const roleMapping: { [key: string]: string } = {
  'admin': 'Super Admin',
  'ceo': 'CEO',
  'manager': 'Manager',
  'hr': 'HR Admin',
  'employee': 'Employee',
  'intern': 'Intern',
};

async function syncEmployeesToUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db!;
    
    // Get all employees and users
    const employees = await db.collection('employees').find({}).toArray();
    const existingUsers = await db.collection('users').find({}).toArray();
    const roles = await db.collection('roles').find({}).toArray();

    console.log(`\n📊 Found ${employees.length} employees`);
    console.log(`📊 Found ${existingUsers.length} existing users`);
    console.log(`📊 Found ${roles.length} roles\n`);

    // Create a map of employeeId -> User for quick lookup
    const userByEmployeeId = new Map(
      existingUsers.map(u => [u.employeeId?.toString(), u])
    );

    // Create a map of role name -> role for quick lookup (case-insensitive)
    const roleByName = new Map(
      roles.map(r => [r.name.toLowerCase(), r])
    );

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    const defaultPassword = await bcrypt.hash('vihi123', 10);

    for (const employee of employees) {
      const employeeIdStr = employee._id.toString();
      const existingUser = userByEmployeeId.get(employeeIdStr);
      
      // Find the corresponding RBAC role
      const oldRole = (employee.role || 'employee').toLowerCase();
      const newRoleName = roleMapping[oldRole] || 'Employee';
      const rbacRole = roleByName.get(newRoleName.toLowerCase());

      if (!rbacRole) {
        console.log(`❌ Error: Role "${newRoleName}" not found for ${employee.name} (${employee.staffId})`);
        errors++;
        continue;
      }

      if (existingUser) {
        // Check if role needs to be updated
        const currentRoleId = existingUser.roleIds?.[0]?.toString();
        const targetRoleId = rbacRole._id.toString();
        
        if (currentRoleId !== targetRoleId) {
          // Only update if we're moving to a DIFFERENT role and it's significant
          // Don't downgrade managers/CEOs who were manually set
          const currentRole = roles.find(r => r._id.toString() === currentRoleId);
          const isManualOverride = ['Super Admin', 'CEO', 'HR Admin', 'Manager'].includes(currentRole?.name);
          
          if (isManualOverride) {
            console.log(`⏭️  Skipping ${employee.name} (${employee.staffId}) - Manual role override (${currentRole?.name})`);
            skipped++;
          } else {
            // Update the role
            await db.collection('users').updateOne(
              { _id: existingUser._id },
              { $set: { roleIds: [rbacRole._id], updatedAt: new Date() } }
            );
            console.log(`🔄 Updated ${employee.name} (${employee.staffId}): ${currentRole?.name} -> ${newRoleName}`);
            updated++;
          }
        } else {
          console.log(`⏭️  Skipping ${employee.name} (${employee.staffId}) - Role already correct (${newRoleName})`);
          skipped++;
        }
        continue;
      }

      // Create new User record
      try {
        await db.collection('users').insertOne({
          email: employee.email,
          employeeId: employee._id,
          roleIds: [rbacRole._id],
          status: 'active',
          password: defaultPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log(`✅ Created User for ${employee.name} (${employee.staffId}) -> ${newRoleName}`);
        created++;
      } catch (err: any) {
        if (err.code === 11000) {
          console.log(`⏭️  Skipping ${employee.name} (${employee.staffId}) - Duplicate email`);
          skipped++;
        } else {
          console.log(`❌ Error creating user for ${employee.name}: ${err.message}`);
          errors++;
        }
      }
    }

    console.log('\n========== SUMMARY ==========');
    console.log(`✅ Created: ${created} users`);
    console.log(`🔄 Updated: ${updated} users`);
    console.log(`⏭️  Skipped: ${skipped} users`);
    console.log(`❌ Errors: ${errors}`);
    console.log('==============================\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

syncEmployeesToUsers();
