import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Role from '../models/Role.model';

dotenv.config();

async function debugInternRole() {
    let output = '';
    const log = (msg: string) => {
        console.log(msg);
        output += msg + '\n';
    };

    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        log('Connected to MongoDB');

        // Find Intern role
        const internRole = await Role.findOne({ name: 'Intern' });
        log('\n=== INTERN ROLE ===');
        if (!internRole) {
            log('Intern role NOT FOUND!');
        } else {
            log('Role ID: ' + internRole._id);
            log('Name: ' + internRole.name);
            log('Description: ' + internRole.description);
            log('Permission Keys: ' + JSON.stringify(internRole.permissionKeys, null, 2));
            log('\n=== CRITICAL CHECKS ===');
            log('Has approve_leaves: ' + internRole.permissionKeys.includes('approve_leaves'));
            log('Has manage_leaves: ' + internRole.permissionKeys.includes('manage_leaves'));
        }

        // Write to file
        fs.writeFileSync('debug_intern_role.txt', output);
        log('\nOutput written to debug_intern_role.txt');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

debugInternRole();
