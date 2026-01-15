import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function addAdminPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to database');

    const db = mongoose.connection.db!;
    
    const adminPermissions = ['manage_permissions', 'manage_roles', 'manage_users', 'view_admin'];
    
    // Add admin permissions to CEO, HR Admin, and Manager roles
    const roles = ['CEO', 'HR Admin', 'Manager'];
    
    for (const roleName of roles) {
      const result = await db.collection('roles').updateOne(
        { name: roleName },
        { 
          $addToSet: { 
            permissionKeys: { 
              $each: adminPermissions 
            } 
          } 
        }
      );
      console.log(`Updated ${roleName} role:`, result.modifiedCount > 0 ? 'Success' : 'Already has permissions or not found');
    }
    
    // Verify all roles
    for (const roleName of roles) {
      const role = await db.collection('roles').findOne({ name: roleName });
      console.log(`\n${roleName} permissions now include admin permissions:`, 
        adminPermissions.every(p => role?.permissionKeys?.includes(p)));
    }
    
    await mongoose.disconnect();
    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addAdminPermissions();
