import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixMissingUserNames() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db!;
    
    // Find users with missing names
    const users = await db.collection('users').find({
      $or: [
        { name: null },
        { name: '' },
        { name: { $exists: false } }
      ]
    }).toArray();
    
    console.log(`\nFound ${users.length} users with missing names:\n`);
    
    let updatedCount = 0;
    for (const user of users) {
      console.log(`- Email: ${user.email}`);
      
      if (user.employeeId) {
        const employee = await db.collection('employees').findOne({ _id: user.employeeId });
        if (employee && employee.name) {
          await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { name: employee.name } }
          );
          console.log(`  -> Updated name to: ${employee.name}`);
          updatedCount++;
        } else {
          console.log(`  -> No employee found or employee has no name`);
        }
      } else {
        console.log(`  -> No employeeId linked`);
      }
    }
    
    console.log(`\n✅ Updated ${updatedCount} users with names from their Employee records`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixMissingUserNames();
