import mongoose from 'mongoose';
import Role from '../models/Role.model';
import { connectDB } from '../config/database';
import dotenv from 'dotenv';
import { logger } from '../config/logger';

dotenv.config();

const updateManagerPermissions = async () => {
    try {
        await connectDB();

        logger.info('🔄 Updating Manager permissions...');

        const managerRole = await Role.findOne({ name: 'Manager' });
        if (!managerRole) {
            logger.error('❌ Manager role not found');
            return;
        }

        if (!managerRole.permissionKeys.includes('comment_intern_diary')) {
            managerRole.permissionKeys.push('comment_intern_diary');
            await managerRole.save();
            logger.info('✅ Added "comment_intern_diary" to Manager role');
        } else {
            logger.info('ℹ️  Manager role already has "comment_intern_diary" permission');
        }

        // Also check Intern Mentor
        const mentorRole = await Role.findOne({ name: 'Intern Mentor' });
        if (mentorRole && !mentorRole.permissionKeys.includes('comment_intern_diary')) {
            mentorRole.permissionKeys.push('comment_intern_diary');
            await mentorRole.save();
            logger.info('✅ Added "comment_intern_diary" to Intern Mentor role');
        }

        logger.info('🎉 Permissions update completed');
        process.exit(0);
    } catch (error) {
        logger.error('❌ Error updating permissions:', error);
        process.exit(1);
    }
};

updateManagerPermissions();
