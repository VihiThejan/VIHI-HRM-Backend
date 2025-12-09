import mongoose from 'mongoose';
import Employee from '../models/Employee.model';
import User from '../models/User.model';
import dotenv from 'dotenv';
import { logger } from '../config/logger';

dotenv.config();

const addStaffIds = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vihi_hrm');
    logger.info('Connected to MongoDB');

    // Get all employees without staffId
    const employees = await Employee.find({ $or: [{ staffId: null }, { staffId: { $exists: false } }] });

    logger.info(`Found ${employees.length} employees without staff IDs`);

    // Counter for generating sequential staff IDs
    let counter = 1;

    // Check for existing staff IDs to get the next number
    const lastEmployee = await Employee.findOne({ staffId: { $exists: true, $ne: null } })
      .sort({ staffId: -1 })
      .limit(1);

    if (lastEmployee && lastEmployee.staffId) {
      const match = lastEmployee.staffId.match(/\d+$/);
      if (match) {
        counter = parseInt(match[0]) + 1;
      }
    }

    // Update each employee with a staff ID
    for (const employee of employees) {
      const staffId = `VIHI${String(counter).padStart(3, '0')}`;
      
      employee.staffId = staffId;
      await employee.save();

      logger.info(`Updated ${employee.name} with staff ID: ${staffId}`);
      counter++;
    }

    logger.info('✅ Successfully added staff IDs to all employees');

    // Close connection
    await mongoose.connection.close();
  } catch (error) {
    logger.error('Error adding staff IDs:', error);
    process.exit(1);
  }
};

// Run if this script is executed directly
if (require.main === module) {
  addStaffIds();
}

export { addStaffIds };
