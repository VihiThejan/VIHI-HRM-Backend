import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import User from '../models/User.model';
import Employee from '../models/Employee.model';
import { connectDB } from '../config/database';

dotenv.config();

const checkConsistency = async () => {
    try {
        await connectDB();

        let report = '';
        const log = (msg: string) => {
            console.log(msg);
            report += msg + '\n';
        };

        log('Connected to database...');

        const users = await User.find({});
        const employees = await Employee.find({});

        log(`Total Users: ${users.length}`);
        log(`Total Employees: ${employees.length}`);

        const usersWithoutEmployeeId = users.filter(u => !u.employeeId);
        const usersWithInvalidEmployeeId = [];
        const usersNotLinkedButEmailMatch = [];

        for (const user of users) {
            if (user.employeeId) {
                const emp = employees.find(e => e._id.toString() === user.employeeId?.toString());
                if (!emp) {
                    // @ts-ignore
                    usersWithInvalidEmployeeId.push(user);
                }
            } else {
                // Check if there is an employee with the same email
                const emp = employees.find(e => e.email.toLowerCase() === user.email.toLowerCase());
                if (emp) {
                    // @ts-ignore
                    usersNotLinkedButEmailMatch.push({ user, employee: emp });
                }
            }
        }

        log('\n--- Analysis ---');
        log(`Users without 'employeeId' field: ${usersWithoutEmployeeId.length}`);
        usersWithoutEmployeeId.forEach(u => log(` - ${u.name} (${u.email})`));

        if (usersWithInvalidEmployeeId.length > 0) {
            log(`\nUsers with 'employeeId' pointing to non-existent Employee: ${usersWithInvalidEmployeeId.length}`);
            // @ts-ignore
            usersWithInvalidEmployeeId.forEach(u => log(` - ${u.name} (ID: ${u.employeeId})`));
        }

        if (usersNotLinkedButEmailMatch.length > 0) {
            log(`\nUsers NOT linked to Employee, but Email matches an existing Employee: ${usersNotLinkedButEmailMatch.length}`);
            // @ts-ignore
            usersNotLinkedButEmailMatch.forEach(item => log(` - User: ${item.user.name} <-> Employee: ${item.employee.name} (${item.user.email})`));
        }

        const linkedUserIds = users.filter(u => u.employeeId).map(u => u.employeeId?.toString());
        const employeesWithoutUsers = employees.filter(e => !linkedUserIds.includes(e._id.toString()));

        log(`\nEmployees who do not have a linked User account: ${employeesWithoutUsers.length}`);
        employeesWithoutUsers.forEach(e => log(` - ${e.name} (${e.email})`));

        fs.writeFileSync('consistency_report_utf8.txt', report, 'utf8');
        console.log('Report saved to consistency_report_utf8.txt');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkConsistency();
