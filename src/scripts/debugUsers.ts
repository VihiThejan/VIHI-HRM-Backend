import mongoose from 'mongoose';
import Employee from '../models/Employee.model';
import User from '../models/User.model';
import Role from '../models/Role.model';
import { connectDB } from '../config/database';
import dotenv from 'dotenv';
import { logger } from '../config/logger';

dotenv.config();

const debugUsers = async () => {
    try {
        await connectDB();
        console.log('🔍 Starting User/Permission Audit...');

        // 1. Check Roles First
        console.log('\n--- ROLES CHECK ---');
        const roles = await Role.find({});
        roles.forEach(r => {
            const hasPermission = r.permissionKeys.includes('comment_intern_diary');
            console.log(`Role: ${r.name} | Has 'comment_intern_diary': ${hasPermission ? '✅' : '❌'}`);
            if (!hasPermission) {
                console.log(`   Keys: ${r.permissionKeys.filter(k => k.includes('intern')).join(', ')}`);
            }
        });

        // 2. Check Employees and their resolved permissions
        console.log('\n--- EMPLOYEES CHECK ---');
        const employees = await Employee.find({});

        for (const emp of employees) {
            // Find linked user
            const user = await User.findOne({ employeeId: emp._id });

            console.log(`\nEmployee: ${emp.name} (${emp.email})`);
            console.log(`Status: ${emp.status}, Role Field: ${emp.role}`);

            let permissions: string[] = [];
            let source = '';

            if (user) {
                source = 'RBAC (User Model)';
                const userRoles = await Role.find({ _id: { $in: user.roleIds } });
                permissions = [...new Set(userRoles.flatMap(r => r.permissionKeys))];
                console.log(`User Linked: YES. Roles: ${userRoles.map(r => r.name).join(', ')}`);
            } else {
                source = 'Legacy (Hardcoded Map)';
                // Replicate logic from auth.controller.ts
                const rolePermissionMap: { [key: string]: string[] } = {
                    admin: ['view_dashboard', 'manage_employees', 'manage_recruitment', 'approve_leaves', 'manage_attendance', 'manage_payroll', 'manage_performance', 'manage_interns', 'manage_roles', 'manage_users', 'manage_permissions'],
                    ceo: ['view_dashboard', 'view_employees', 'view_payroll', 'approve_payroll', 'view_performance', 'comment_intern_diary'],
                    manager: ['view_dashboard', 'view_employees', 'approve_leaves', 'view_attendance', 'view_performance', 'manage_interns', 'comment_intern_diary'],
                    employee: ['view_dashboard', 'request_leave', 'view_leaves', 'create_attendance', 'view_attendance'],
                    intern: ['view_dashboard', 'track_own_time', 'request_leave', 'view_leaves', 'create_attendance', 'view_attendance'],
                };
                permissions = rolePermissionMap[emp.role] || [];
                console.log(`User Linked: NO. Using hardcoded map for role '${emp.role}'`);
            }

            const hasAccess = permissions.includes('comment_intern_diary');
            console.log(`Source: ${source}`);
            console.log(`Has 'comment_intern_diary': ${hasAccess ? '✅' : '❌'}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error during audit:', error);
        process.exit(1);
    }
};

debugUsers();
