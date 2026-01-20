
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from '../models/Employee.model';

dotenv.config();

const createTestIntern = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vihi_hrm';
        await mongoose.connect(mongoURI);
        console.log('✅ MongoDB Connected');

        const staffId = `INT${Date.now()}`;
        const password = 'password123';

        // Create intern user
        const intern = await Employee.create({
            name: 'Direct DB Intern',
            email: `intern${Date.now()}@vihi.com`,
            password: password,
            phone: '1234567890',
            address: 'Test Address',
            department: 'IT',
            position: 'Intern',
            salary: 0,
            staffId: staffId,
            role: 'intern',
            status: 'active',
            passwordResetRequired: false,
            universityId: 'UNI123',
            university: 'Uni',
            course: 'CS'
        });

        console.log('✅ Test Intern created successfully!');
        console.log('Staff ID:', staffId);
        console.log('Password:', password);

        // We need to return this info for the other script or just print it
        console.log(`JSON_RESULT:{"staffId":"${staffId}","password":"${password}"}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating intern:', error);
        process.exit(1);
    }
};

createTestIntern();
