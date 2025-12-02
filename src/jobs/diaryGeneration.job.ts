import cron from 'node-cron';
import { logger } from '../config/logger';
import InternTimeTracking from '../models/InternTimeTracking.model';
import { startOfWeek, endOfWeek } from 'date-fns';
import { generateInternDiary } from '../utils/pdfGenerator';
import path from 'path';
import fs from 'fs';

// Run every Sunday at midnight to generate weekly diaries
cron.schedule('0 0 * * 0', async () => {
  try {
    logger.info('Starting weekly diary generation job...');

    const lastWeekStart = startOfWeek(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(lastWeekStart, { weekStartsOn: 1 });

    // Find all completed weeks that haven't generated diaries yet
    const records = await InternTimeTracking.find({
      weekStartDate: lastWeekStart,
      weekEndDate: lastWeekEnd,
      diaryGenerated: false,
      status: 'completed',
    }).populate('internId', 'name email');

    logger.info(`Found ${records.length} records to process`);

    // Ensure output directory exists
    const outputPath = path.join(process.cwd(), 'uploads', 'diaries');
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    let successCount = 0;
    let errorCount = 0;

    for (const record of records) {
      try {
        const internName = (record.internId as any).name;
        
        // Generate PDF
        const pdfPath = await generateInternDiary(record, internName, outputPath);
        
        // Update record
        record.diaryGenerated = true;
        record.diaryUrl = `/uploads/diaries/${path.basename(pdfPath)}`;
        await record.save();

        logger.info(`Diary generated for intern ${internName} (${record.internId})`);
        successCount++;
      } catch (error) {
        logger.error(`Error generating diary for intern ${record.internId}:`, error);
        errorCount++;
      }
    }

    logger.info(`Weekly diary generation completed. Success: ${successCount}, Errors: ${errorCount}`);
  } catch (error) {
    logger.error('Error in diary generation job:', error);
  }
});

logger.info('📅 Diary generation cron job scheduled (Every Sunday at midnight)');
