import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkPermissionAccess() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db!;

    // Find roles with manage_permissions
    const rolesWithPermission = await db.collection('roles').find({
      permissionKeys: 'manage_permissions'
    }).toArray();

    console.log('=== Roles with manage_permissions ===');
    rolesWithPermission.forEach(r => console.log('-', r.name));

    // Get all users and check which have access
    const roleIds = rolesWithPermission.map(r => r._id);
    const usersWithAccess = await db.collection('users').find({
      roleIds: { $in: roleIds }
    }).project({ email: 1, name: 1 }).toArray();

    console.log('\n=== Users with manage_permissions ===');
    if (usersWithAccess.length === 0) {
      console.log('NO USERS HAVE ACCESS! This is the problem.');
    } else {
      usersWithAccess.forEach(u => console.log('-', u.email, '|', u.name));
    }

    // Show all users for comparison
    console.log('\n=== All Users ===');
    const allUsers = await db.collection('users').find({}).project({ email: 1, roleIds: 1 }).toArray();
    for (const user of allUsers) {
      const userRoles = await db.collection('roles').find({ _id: { $in: user.roleIds || [] } }).project({ name: 1 }).toArray();
      const roleNames = userRoles.map(r => r.name).join(', ') || 'No roles';
      console.log('-', user.email, '|', roleNames);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkPermissionAccess();
