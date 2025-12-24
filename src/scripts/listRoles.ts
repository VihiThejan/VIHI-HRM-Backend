import mongoose from 'mongoose';
import Role from '../models/Role.model';
import { connectDB } from '../config/database';
import dotenv from 'dotenv';
import { logger } from '../config/logger';

dotenv.config();

const listRoles = async () => {
    try {
        await connectDB();

        console.log('📋 Listing all roles...');

        const roles = await Role.find({});

        roles.forEach(role => {
            console.log(`Role: ${role.name}`);
            console.log(`Permissions: ${role.permissionKeys.filter(k => k.includes('diary') || k.includes('intern')).join(', ')}`);
            console.log('---');
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error listing roles:', error);
        process.exit(1);
    }
};

listRoles();
