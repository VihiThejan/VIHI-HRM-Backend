import mongoose from 'mongoose';
import Employee from '../models/Employee.model';
import User from '../models/User.model';
import Role from '../models/Role.model';
import Permission from '../models/Permission.model';
import { connectDB } from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

const debugPermissions = async () => {
    try {
        await connectDB();
        console.log('🔍 Starting Permission Debug for 403 Error...\n');

        // 1. Check if manage_permissions exists in Permission collection
        console.log('--- PERMISSION CHECK ---');
        const managePermission = await Permission.findOne({ key: 'manage_permissions' });
        if (managePermission) {
            console.log(`✅ 'manage_permissions' exists in Permission collection`);
            console.log(`   Module: ${managePermission.module}, Action: ${managePermission.action}`);
        } else {
            console.log(`❌ 'manage_permissions' does NOT exist in Permission collection!`);
        }

        // 2. Check which roles have manage_permissions
        console.log('\n--- ROLES WITH manage_permissions ---');
        const rolesWithPermission = await Role.find({ permissionKeys: 'manage_permissions' });
        if (rolesWithPermission.length > 0) {
            rolesWithPermission.forEach(r => {
                console.log(`✅ Role: ${r.name} has 'manage_permissions'`);
            });
        } else {
            console.log(`❌ No roles have 'manage_permissions' assigned!`);
        }

        // 3. List all roles and their permission count
        console.log('\n--- ALL ROLES ---');
        const allRoles = await Role.find({});
        allRoles.forEach(r => {
            const hasManagePerms = r.permissionKeys.includes('manage_permissions');
            const hasManageRoles = r.permissionKeys.includes('manage_roles');
            const hasManageUsers = r.permissionKeys.includes('manage_users');
            console.log(`Role: ${r.name.padEnd(20)} | Perms: ${r.permissionKeys.length.toString().padStart(3)} | manage_permissions: ${hasManagePerms ? '✅' : '❌'} | manage_roles: ${hasManageRoles ? '✅' : '❌'} | manage_users: ${hasManageUsers ? '✅' : '❌'}`);
        });

        // 4. Find all users with admin-type roles
        console.log('\n--- USERS WITH ADMIN/CEO ROLES ---');
        const adminRoles = await Role.find({ name: { $in: ['Admin', 'admin', 'CEO', 'ceo', 'Super Admin'] } });
        const adminRoleIds = adminRoles.map(r => r._id);

        const adminUsers = await User.find({ roleIds: { $in: adminRoleIds } });

        for (const user of adminUsers) {
            const employee = await Employee.findById(user.employeeId);
            const userRoles = await Role.find({ _id: { $in: user.roleIds } });
            const permissions = [...new Set(userRoles.flatMap(r => r.permissionKeys))];

            console.log(`\nUser: ${employee?.name || 'Unknown'} (${employee?.email || 'No email'})`);
            console.log(`   Roles: ${userRoles.map(r => r.name).join(', ')}`);
            console.log(`   Total permissions: ${permissions.length}`);
            console.log(`   Has manage_permissions: ${permissions.includes('manage_permissions') ? '✅' : '❌'}`);
        }

        // 5. Show all users and their link status
        console.log('\n--- ALL EMPLOYEES & USER LINK STATUS ---');
        const employees = await Employee.find({ status: 'active' }).limit(20);

        for (const emp of employees) {
            const user = await User.findOne({ employeeId: emp._id });

            if (user) {
                const userRoles = await Role.find({ _id: { $in: user.roleIds } });
                const permissions = [...new Set(userRoles.flatMap(r => r.permissionKeys))];
                const hasManagePerms = permissions.includes('manage_permissions');

                console.log(`${emp.name.padEnd(25)} | Role: ${emp.role.padEnd(10)} | User: ✅ | Roles: ${userRoles.map(r => r.name).join(', ').padEnd(20)} | manage_permissions: ${hasManagePerms ? '✅' : '❌'}`);
            } else {
                // Fallback check
                const rolePermissionMap: { [key: string]: string[] } = {
                    admin: ['manage_permissions'],
                    ceo: [],
                    manager: [],
                    employee: [],
                    intern: [],
                };
                const hasManagePerms = (rolePermissionMap[emp.role] || []).includes('manage_permissions');
                console.log(`${emp.name.padEnd(25)} | Role: ${emp.role.padEnd(10)} | User: ❌ | (Fallback) manage_permissions: ${hasManagePerms ? '✅' : '❌'}`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error during debug:', error);
        process.exit(1);
    }
};

debugPermissions();
