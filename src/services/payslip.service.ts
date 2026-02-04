import PDFDocument from 'pdfkit';
import Payroll, { IPayroll } from '../models/Payroll.model';

export async function generatePayslipPDF(payrollId: string): Promise<Buffer> {
  const payroll = await Payroll.findById(payrollId).populate('employeeId', 'name email department position staffId');
  if (!payroll) throw new Error('Payroll not found');
  const employee = payroll.employeeId as any;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('VIHI HRM', { align: 'center' });
    doc.fontSize(16).font('Helvetica').text('Payslip', { align: 'center' });
    doc.moveDown(2);

    // Employee Details
    doc.fontSize(12).font('Helvetica-Bold').text('Employee Details');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.font('Helvetica');
    doc.text(`Name: ${employee.name}`);
    doc.text(`Staff ID: ${employee.staffId || 'N/A'}`);
    doc.text(`Department: ${employee.department || 'N/A'}`);
    doc.text(`Position: ${employee.position || 'N/A'}`);
    doc.text(`Email: ${employee.email}`);
    doc.moveDown();

    // Pay Period
    doc.font('Helvetica-Bold').text('Pay Period');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.font('Helvetica');
    const period = `${payroll.month}-${payroll.year}`;
    doc.text(`Period: ${period}`);
    doc.moveDown();

    // Earnings
    doc.font('Helvetica-Bold').text('Earnings');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.font('Helvetica');
    doc.text(`Base Salary: ₹${payroll.baseSalary.toLocaleString()}`);
    
    const bonuses = payroll.bonuses 
      ? (payroll.bonuses.performance || 0) + (payroll.bonuses.overtime || 0) + (payroll.bonuses.other || 0)
      : 0;
    doc.text(`Bonuses: ₹${bonuses.toLocaleString()}`);
    
    const totalEarnings = payroll.baseSalary + bonuses;
    doc.font('Helvetica-Bold').text(`Total Earnings: ₹${totalEarnings.toLocaleString()}`);
    doc.moveDown();

    // Deductions
    doc.font('Helvetica-Bold').text('Deductions');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.font('Helvetica');
    
    const deductions = payroll.deductions || { tax: 0, insurance: 0, lateDeductions: 0, other: 0 };
    doc.text(`Tax: ₹${(deductions.tax || 0).toLocaleString()}`);
    doc.text(`Insurance: ₹${(deductions.insurance || 0).toLocaleString()}`);
    doc.text(`Late Deductions: ₹${(deductions.lateDeductions || 0).toLocaleString()}`);
    doc.text(`Other: ₹${(deductions.other || 0).toLocaleString()}`);
    
    const totalDeductions = (deductions.tax || 0) + (deductions.insurance || 0) + 
      (deductions.lateDeductions || 0) + (deductions.other || 0);
    doc.font('Helvetica-Bold').text(`Total Deductions: ₹${totalDeductions.toLocaleString()}`);
    doc.moveDown();

    // Net Salary
    doc.fontSize(14).font('Helvetica-Bold');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.text(`Net Salary: ₹${payroll.netSalary.toLocaleString()}`, { align: 'right' });
    doc.moveDown();

    // Status
    doc.fontSize(10).font('Helvetica');
    doc.text(`Status: ${payroll.status.toUpperCase()}`, { align: 'right' });
    doc.moveDown(2);

    // Footer
    doc.fontSize(8).text('This is a computer-generated document. No signature is required.', { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });

    doc.end();
  });
}
