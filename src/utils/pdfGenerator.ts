import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { IInternTimeTracking } from '../models/InternTimeTracking.model';

export const generateInternDiary = async (
  tracking: IInternTimeTracking,
  internName: string,
  outputPath: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Ensure output directory exists
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
      }

      const doc = new PDFDocument({ margin: 50 });
      const filePath = path.join(outputPath, `diary-${tracking.internId}-${Date.now()}.pdf`);
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);

      // Header
      doc.fontSize(24).fillColor('#2563eb').text('Intern Weekly Diary', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#666666').text('VIHI HRM System', { align: 'center' });
      doc.moveDown(2);

      // Intern Info Section
      doc.fontSize(16).fillColor('#1f2937').text('Intern Information', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#374151');
      doc.text(`Name: ${internName}`);
      doc.text(`Week Period: ${tracking.weekStartDate.toDateString()} - ${tracking.weekEndDate.toDateString()}`);
      doc.text(`Total Hours: ${tracking.totalHours} hours`);
      doc.text(`Status: ${tracking.status.toUpperCase()}`);
      doc.moveDown(2);

      // Tasks Section
      doc.fontSize(16).fillColor('#1f2937').text('Weekly Tasks', { underline: true });
      doc.moveDown(1);

      if (tracking.tasks && tracking.tasks.length > 0) {
        tracking.tasks.forEach((task, index) => {
          doc.fontSize(12).fillColor('#2563eb').text(`Task ${index + 1}`, { continued: false });
          doc.fontSize(11).fillColor('#374151');
          doc.text(`Date: ${task.date.toDateString()}`, { indent: 20 });
          doc.text(`Hours: ${task.hours} hour(s)`, { indent: 20 });
          doc.text(`Description:`, { indent: 20 });
          doc.fontSize(10).fillColor('#6b7280').text(task.description, { indent: 40, align: 'justify' });
          doc.moveDown(1);
        });
      } else {
        doc.fontSize(11).fillColor('#9ca3af').text('No tasks recorded for this week.');
      }

      doc.moveDown(2);

      // CEO Comments Section
      if (tracking.ceoComments) {
        doc.fontSize(16).fillColor('#1f2937').text('CEO Comments', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#374151').text(tracking.ceoComments, { align: 'justify' });
        doc.moveDown(2);
      }

      // Footer
      doc.fontSize(8).fillColor('#9ca3af').text(
        `Generated on: ${new Date().toLocaleString()}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );

      doc.end();

      writeStream.on('finish', () => {
        resolve(filePath);
      });

      writeStream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};
