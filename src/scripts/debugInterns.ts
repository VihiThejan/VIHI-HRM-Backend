import mongoose from 'mongoose';
import Employee from '../models/Employee.model';
import { connectDB } from '../config/database';
import dotenv from 'dotenv';
import { logger } from '../config/logger';

dotenv.config();

const debugInterns = async () => {
    try {
        await connectDB();
        console.log('🔍 Checking Intern-Supervisor Relationships...');

        // 1. List all Supervisors (Managers/Generals who might be supervisors)
        const possibleSupervisors = await Employee.find({
            $or: [{ role: 'manager' }, { role: 'admin' }, { role: 'ceo' }]
        });

        console.log('\n--- POSSIBLE SUPERVISORS ---');
        possibleSupervisors.forEach(s => {
            console.log(`Name: ${s.name}, ID: ${s._id}, Role: ${s.role}`);
        });

        // 2. List all Interns
        const interns = await Employee.find({ position: 'Intern' }); // Case sensitive check from controller

        console.log('\n--- INTERNS ---');
        if (interns.length === 0) {
            console.log('❌ No employees found with position "Intern" (Note: Case Sensitive check in controller)');

            // Check if there are any case variants
            const allInterns = await Employee.find({ position: { $regex: /intern/i } });
            if (allInterns.length > 0) {
                console.log(`⚠️  Found ${allInterns.length} interns with different casing:`);
                allInterns.forEach(i => console.log(`   - ${i.name}: Position="${i.position}"`));
            }
        }

        interns.forEach(i => {
            console.log(`Name: ${i.name}, ID: ${i._id}`);
            console.log(`   Supervisor Field: ${i.supervisor}`);

            // Check validity
            if (i.supervisor) {
                const supervisorExists = possibleSupervisors.find(s => s._id.toString() === i.supervisor?.toString());
                console.log(`   Valid Supervisor Link: ${supervisorExists ? '✅ (' + supervisorExists.name + ')' : '❌ (ID not found in list above)'}`);
            } else {
                console.log(`   Valid Supervisor Link: ❌ (Field missing or null)`);
            }
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error debugging interns:', error);
        process.exit(1);
    }
};

debugInterns();
