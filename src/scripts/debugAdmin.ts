import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import User from '../models/User.model';
import Role from '../models/Role.model';
import Employee from '../models/Employee.model';

dotenv.config();

async function debugAdmin() {
    let output = '';
    const log = (msg: string) => {
        console.log(msg);
        output += msg + '\n';
    };

    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        log('Connected to MongoDB');

        // Find admin user
        const adminUser = await User.findOne({ email: 'admin@vihi.com' });
        log('\n=== ADMIN USER ===');
        if (!adminUser) {
            log('Admin user NOT FOUND!');
        } else {
            log('User ID: ' + adminUser._id);
            log('Name: ' + adminUser.name);
            log('Email: ' + adminUser.email);
            log('Status: ' + adminUser.status);
            log('Employee ID: ' + adminUser.employeeId);
            log('Role IDs: ' + JSON.stringify(adminUser.roleIds));

            // Get roles
            if (adminUser.roleIds && adminUser.roleIds.length > 0) {
                const roles = await Role.find({ _id: { $in: adminUser.roleIds } });
                log('\n=== ROLES ===');
                roles.forEach(role => {
                    log('Role: ' + role.name);
                    log('  Permission Keys: ' + JSON.stringify(role.permissionKeys));
                });

                // Get all permissions
                const allPermissions = [...new Set(roles.flatMap(r => r.permissionKeys))];
                log('\n=== ALL PERMISSIONS ===');
                log(JSON.stringify(allPermissions, null, 2));
            } else {
                log('NO ROLES ASSIGNED!');
            }
        }

        // Find admin employee
        const adminEmployee = await Employee.findOne({ email: 'admin@vihi.com' });
        log('\n=== ADMIN EMPLOYEE ===');
        if (!adminEmployee) {
            log('Admin employee NOT FOUND!');
        } else {
            log('Employee ID: ' + adminEmployee._id);
            log('Name: ' + adminEmployee.name);
            log('Email: ' + adminEmployee.email);
            log('Role: ' + adminEmployee.role);
            log('Status: ' + adminEmployee.status);
        }

        // Write to file
        fs.writeFileSync('debug_admin_output.txt', output);
        log('\nOutput written to debug_admin_output.txt');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

debugAdmin();
