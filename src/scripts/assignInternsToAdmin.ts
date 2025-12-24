import mongoose from 'mongoose';
import Employee from '../models/Employee.model';
import { connectDB } from '../config/database';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const assignInterns = async () => {
    try {
        await connectDB();
        console.log('🔄 Assigning Interns to Supervisor...');

        // 1. Find the System Admin (or first admin)
        const admin = await Employee.findOne({ role: 'admin' });

        if (!admin) {
            console.error('❌ No Admin found to assign interns to!');
            process.exit(1);
        }

        console.log(`✅ Found Supervisor (Admin): ${admin.name} (ID: ${admin._id})`);

        // 2. Find all Interns
        const interns = await Employee.find({ position: 'Intern' });
        console.log(`ℹ️  Found ${interns.length} interns.`);

        // 3. Update Supervisor Field
        const result = await Employee.updateMany(
            { position: 'Intern' },
            { $set: { supervisor: admin._id } }
        );

        console.log(`✅ Updated ${result.modifiedCount} interns to have supervisor: ${admin.name}`);
        console.log('🎉 Done!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error assigning interns:', error);
        process.exit(1);
    }
};

assignInterns();
