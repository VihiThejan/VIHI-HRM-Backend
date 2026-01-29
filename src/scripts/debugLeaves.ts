import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Leave from '../models/Leave.model';
import Employee from '../models/Employee.model';
import User from '../models/User.model';

dotenv.config();

async function debugLeaves() {
    let output = '';
    const log = (msg: string) => {
        console.log(msg);
        output += msg + '\n';
    };

    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        log('Connected to MongoDB');

        // Get all leaves
        const leaves = await Leave.find({}).populate('employeeId', 'name email role');
        log('\n=== ALL LEAVES IN DATABASE ===');
        log('Total leaves: ' + leaves.length);

        if (leaves.length === 0) {
            log('No leaves found in database!');
        } else {
            leaves.forEach((leave, i) => {
                log(`\nLeave ${i + 1}:`);
                log('  ID: ' + leave._id);
                log('  Employee ID: ' + JSON.stringify(leave.employeeId));
                log('  Type: ' + leave.type);
                log('  Status: ' + leave.status);
                log('  Start: ' + leave.startDate);
                log('  End: ' + leave.endDate);
            });
        }

        // Get all employees
        log('\n=== ALL EMPLOYEES ===');
        const employees = await Employee.find({}).select('name email role _id');
        employees.forEach(emp => {
            log(`  ${emp.name} (${emp.email}) - Role: ${emp.role} - ID: ${emp._id}`);
        });

        // Get all users with their employee links
        log('\n=== ALL USERS (RBAC) ===');
        const users = await User.find({}).populate('employeeId', 'name email');
        users.forEach(user => {
            log(`  ${user.name} (${user.email}) - EmployeeId: ${user.employeeId ? (user.employeeId as any)._id : 'NOT LINKED'}`);
        });

        // Write to file
        fs.writeFileSync('debug_leaves_output.txt', output);
        log('\nOutput written to debug_leaves_output.txt');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

debugLeaves();
