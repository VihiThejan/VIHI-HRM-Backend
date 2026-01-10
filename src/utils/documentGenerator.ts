import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { IDiaryEntry } from '../models/DiaryEntry.model';
import { logger } from '../config/logger';

// Ensure uploads directory exists (only in non-serverless environments)
const uploadsDir = path.join(__dirname, '../../uploads/diaries');
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

// Generate DOCX document for supervisor
export const generateDiaryDocument = async (diary: IDiaryEntry): Promise<Buffer> => {
  try {
    const intern = diary.internId as any;
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header
          new Paragraph({
            text: 'INTERNSHIP WEEKLY DIARY',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 }
          }),
          
          // Intern Information
          new Paragraph({
            text: 'Intern Information',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Name: ', bold: true }),
              new TextRun(intern.name || 'N/A')
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Staff ID: ', bold: true }),
              new TextRun(intern.staffId || 'N/A')
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'University ID: ', bold: true }),
              new TextRun(intern.universityId || 'N/A')
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'University: ', bold: true }),
              new TextRun(intern.university || 'N/A')
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Course: ', bold: true }),
              new TextRun(intern.course || 'N/A')
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Week Number: ', bold: true }),
              new TextRun(`Week ${diary.weekNumber}`)
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Period: ', bold: true }),
              new TextRun(`${diary.weekStartDate.toLocaleDateString()} - ${diary.weekEndDate.toLocaleDateString()}`)
            ],
            spacing: { after: 300 }
          }),

          // Daily Entries
          new Paragraph({
            text: 'Daily Diary Entries',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 }
          }),

          // Generate paragraphs for each day
          ...diary.entries.flatMap(entry => [
            new Paragraph({
              text: `${entry.dayOfWeek} - ${entry.date.toLocaleDateString()}`,
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Tasks Completed:', bold: true })
              ],
              spacing: { after: 100 }
            }),
            ...entry.tasks.map(task => 
              new Paragraph({
                text: `• ${task.description} (${task.completionStatus}, ${task.timeSpent || 0} hours)`,
                bullet: { level: 0 },
                spacing: { after: 50 }
              })
            ),
            new Paragraph({
              children: [
                new TextRun({ text: 'Diary Entry:', bold: true })
              ],
              spacing: { before: 100, after: 100 }
            }),
            new Paragraph({
              text: entry.generatedEntry || 'No entry generated',
              spacing: { after: 200 }
            })
          ]),

          // Supervisor Feedback
          new Paragraph({
            text: 'Supervisor Feedback',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: diary.generatedFeedback || 'Feedback pending',
            spacing: { after: 300 }
          }),

          // Supervisor Comments (if any)
          ...(diary.supervisorComments ? [
            new Paragraph({
              children: [
                new TextRun({ text: 'Additional Comments:', bold: true })
              ],
              spacing: { before: 200, after: 100 }
            }),
            new Paragraph({
              text: diary.supervisorComments,
              spacing: { after: 300 }
            })
          ] : []),

          // Signature Section
          new Paragraph({
            text: '_'.repeat(50),
            spacing: { before: 400 }
          }),
          new Paragraph({
            text: 'Supervisor Signature & Date',
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '(To be signed digitally)', italics: true })
            ],
            alignment: AlignmentType.CENTER
          })
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    return buffer;
  } catch (error) {
    logger.error('Error generating diary document:', error);
    throw new Error('Failed to generate diary document');
  }
};

// Generate signed PDF with digital signature
export const generateSignedDiaryPDF = async (
  diary: IDiaryEntry,
  signatureDataUrl: string,
  supervisorId: string
): Promise<{ signatureUrl: string; documentUrl: string }> => {
  try {
    const intern = diary.internId as any;
    const timestamp = Date.now();
    const signatureFileName = `signature_${diary._id}_${timestamp}.png`;
    const pdfFileName = `diary_signed_${diary._id}_${timestamp}.pdf`;
    
    const signaturePath = path.join(uploadsDir, signatureFileName);
    const pdfPath = path.join(uploadsDir, pdfFileName);

    // Save signature image
    const base64Data = signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const signatureBuffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(signaturePath, signatureBuffer);

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    // Title
    doc.fontSize(20).font('Helvetica-Bold').text('INTERNSHIP WEEKLY DIARY', { align: 'center' });
    doc.moveDown();

    // Intern Information
    doc.fontSize(14).font('Helvetica-Bold').text('Intern Information');
    doc.fontSize(11).font('Helvetica');
    doc.text(`Name: ${intern.name || 'N/A'}`);
    doc.text(`Staff ID: ${intern.staffId || 'N/A'}`);
    doc.text(`University ID: ${intern.universityId || 'N/A'}`);
    doc.text(`University: ${intern.university || 'N/A'}`);
    doc.text(`Course: ${intern.course || 'N/A'}`);
    doc.text(`Week Number: Week ${diary.weekNumber}`);
    doc.text(`Period: ${diary.weekStartDate.toLocaleDateString()} - ${diary.weekEndDate.toLocaleDateString()}`);
    doc.moveDown();

    // Daily Entries
    doc.fontSize(14).font('Helvetica-Bold').text('Daily Diary Entries');
    doc.moveDown();

    diary.entries.forEach(entry => {
      doc.fontSize(12).font('Helvetica-Bold').text(`${entry.dayOfWeek} - ${entry.date.toLocaleDateString()}`);
      doc.fontSize(10).font('Helvetica-Bold').text('Tasks Completed:');
      doc.font('Helvetica');
      entry.tasks.forEach(task => {
        doc.text(`• ${task.description} (${task.completionStatus}, ${task.timeSpent || 0} hours)`, { indent: 20 });
      });
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Diary Entry:');
      doc.font('Helvetica').text(entry.generatedEntry || 'No entry generated', { align: 'justify' });
      doc.moveDown();
    });

    // Supervisor Feedback
    doc.fontSize(14).font('Helvetica-Bold').text('Supervisor Feedback');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(diary.generatedFeedback || 'Feedback pending', { align: 'justify' });
    doc.moveDown();

    // Additional Comments
    if (diary.supervisorComments) {
      doc.fontSize(12).font('Helvetica-Bold').text('Additional Comments:');
      doc.fontSize(11).font('Helvetica').text(diary.supervisorComments, { align: 'justify' });
      doc.moveDown();
    }

    // Signature
    doc.moveDown(2);
    doc.fontSize(11).font('Helvetica-Bold').text('Supervisor Signature:');
    doc.image(signaturePath, { width: 150, height: 75 });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Signed on: ${new Date().toLocaleDateString()}`);

    doc.end();

    // Wait for PDF generation to complete
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
    });

    // Return URLs (in production, these would be public URLs)
    const signatureUrl = `/uploads/diaries/${signatureFileName}`;
    const documentUrl = `/uploads/diaries/${pdfFileName}`;

    return { signatureUrl, documentUrl };
  } catch (error) {
    logger.error('Error generating signed PDF:', error);
    throw new Error('Failed to generate signed PDF');
  }
};
