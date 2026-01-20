/**
 * Update Tharin to CEO Role
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function updateTharinToCEO() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db!;
    
    const emp = await db.collection('employees').findOne({ name: /tharin/i });
    console.log('Employee:', emp?.name);
    
    const ceoRole = await db.collection('roles').findOne({ name: 'CEO' });
    console.log('CEO Role ID:', ceoRole?._id);
    
    const result = await db.collection('users').updateOne(
      { employeeId: emp?._id },
      { $set: { roleIds: [ceoRole?._id] } }
    );
    
    console.log('Update result:', result.modifiedCount, 'document(s) modified');
    console.log('✅ Tharin updated to CEO role!');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateTharinToCEO();
