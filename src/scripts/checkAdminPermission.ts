import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model';
import Role from '../models/Role.model';
import Permission from '../models/Permission.model'; // Ensure Permission model is registered
import { connectDB } from '../config/database';

dotenv.config();

const fs = require('fs');

const checkAdminPermissions = async () => {
    try {
        await connectDB();

        let report = '';
        const log = (msg: string) => {
            console.log(msg);
            report += msg + '\n';
        };

        log('Connected to database...');

        const email = 'admin@vihi.com';
        const user = await User.findOne({ email }).populate('roleIds');

        if (!user) {
            log(`User ${email} not found!`);
        } else {
            log(`User: ${user.name} (${user.email})`);
            log('Roles: ' + user.roleIds.map((r: any) => r.name).join(', '));

            let allPermissionKeys: string[] = [];
            for (const role of user.roleIds as any[]) {
                const r = await Role.findById(role._id); // Re-fetch to be sure
                if (r) {
                    log(`\nRole: ${r.name}`);
                    log(`Permission Keys: ${r.permissionKeys.length}`);

                    // Check specifically for manage_permissions
                    const hasManagePermissions = r.permissionKeys.includes('manage_permissions');
                    log(`Has 'manage_permissions': ${hasManagePermissions ? 'YES' : 'NO'}`);

                    allPermissionKeys = [...allPermissionKeys, ...r.permissionKeys];
                }
            }

            const hasIt = allPermissionKeys.includes('manage_permissions');
            log(`\nFinal Result: System Admin has 'manage_permissions'? ${hasIt ? 'YES' : 'NO'}`);
        }

        fs.writeFileSync('permission_check_utf8.txt', report, 'utf8');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkAdminPermissions();
