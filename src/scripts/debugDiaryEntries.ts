
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DiaryEntry from '../models/DiaryEntry.model';

dotenv.config();

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || '');
        console.log('Connected to DB');

        const signedDiaries = await DiaryEntry.find({
            'supervisorSignature.documentUrl': { $exists: true, $ne: '' }
        }).sort({ updatedAt: -1 });

        console.log(`Found ${signedDiaries.length} signed diaries`);

        signedDiaries.forEach(d => {
            console.log(`ID: ${d._id}`);
            console.log(`Status: ${d.weeklyStatus}`);
            console.log(`URL: ${d.supervisorSignature?.documentUrl}`);
            console.log('---');
        });

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
};

debug();
