import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import User from '../models/User.model';
import Role from '../models/Role.model';
import Employee from '../models/Employee.model';

dotenv.config();

async function debugInternPermissions() {
    let output = '';
    const log = (msg: string) => {
        console.log(msg);
        output += msg + '\n';
    };

    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        log('Connected to MongoDB');

        // Find all interns
        const interns = await Employee.find({ role: 'intern' }).select('name email staffId role _id');
        log('\n=== ALL INTERNS ===');

        for (const intern of interns) {
            log(`\nIntern: ${intern.name} (${intern.email})`);
            log(`  Employee ID: ${intern._id}`);
            log(`  Staff ID: ${intern.staffId}`);
            log(`  Employee Role: ${intern.role}`);

            // Find associated RBAC user
            const user = await User.findOne({ employeeId: intern._id });
            if (user) {
                log('  RBAC User Found!');
                log(`    User ID: ${user._id}`);
                log(`    Role IDs: ${JSON.stringify(user.roleIds)}`);

                // Get roles and permissions
                if (user.roleIds && user.roleIds.length > 0) {
                    const roles = await Role.find({ _id: { $in: user.roleIds } });
                    log(`    Roles: ${roles.map(r => r.name).join(', ')}`);

                    const allPermissions = [...new Set(roles.flatMap(r => r.permissionKeys))];
                    log(`    Permission Count: ${allPermissions.length}`);
                    log(`    Has approve_leaves: ${allPermissions.includes('approve_leaves')}`);
                    log(`    Has manage_leaves: ${allPermissions.includes('manage_leaves')}`);
                }
            } else {
                log('  NO RBAC User - using legacy employee role');
            }
        }

        // Write to file
        fs.writeFileSync('debug_intern_permissions.txt', output);
        log('\nOutput written to debug_intern_permissions.txt');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

debugInternPermissions();
