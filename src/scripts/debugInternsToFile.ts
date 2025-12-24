import mongoose from 'mongoose';
import Employee from '../models/Employee.model';
import { connectDB } from '../config/database';
import dotenv from 'dotenv';
import fs from 'fs';
import { logger } from '../config/logger';

dotenv.config();

const logStream = fs.createWriteStream('debug_supervisors.txt', { flags: 'w' });
const log = (msg: string) => {
    console.log(msg);
    logStream.write(msg + '\n');
};

const debugInterns = async () => {
    try {
        await connectDB();
        log('🔍 Checking Intern-Supervisor Relationships...');

        // 1. List all Supervisors
        const possibleSupervisors = await Employee.find({
            $or: [{ role: 'manager' }, { role: 'admin' }, { role: 'ceo' }]
        });

        log('\n--- POSSIBLE SUPERVISORS ---');
        possibleSupervisors.forEach(s => {
            log(`Name: ${s.name}, ID: ${s._id}, Role: ${s.role}`);
        });

        // 2. List all Interns
        const interns = await Employee.find({ position: 'Intern' });

        log('\n--- INTERNS ---');
        if (interns.length === 0) {
            log('❌ No employees found with position "Intern"');
        }

        interns.forEach(i => {
            log(`Name: ${i.name}, ID: ${i._id}`);
            log(`   Supervisor Field: ${i.supervisor}`);

            if (i.supervisor) {
                const supervisorExists = possibleSupervisors.find(s => s._id.toString() === i.supervisor?.toString());
                log(`   Valid Supervisor Link: ${supervisorExists ? '✅ (' + supervisorExists.name + ')' : '❌ (ID not found in list above)'}`);
            } else {
                log(`   Valid Supervisor Link: ❌ (Field missing or null)`);
            }
        });

        log('\n--- END OF REPORT ---');
        // Close stream after a short delay
        setTimeout(() => process.exit(0), 1000);

    } catch (error) {
        log('❌ Error debugging interns: ' + error);
        process.exit(1);
    }
};

debugInterns();
