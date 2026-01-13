import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Employee from '../models/Employee.model';
import DiaryEntry from '../models/DiaryEntry.model';
import * as googleDriveService from '../services/googleDrive.service';
import { logger } from '../config/logger';

/**
 * Check Google Drive connection status
 */
export async function checkConnection(req: Request, res: Response) {
    try {
        const result = await googleDriveService.checkDriveConnection();
        res.json({
            status: 'success',
            connected: result.connected,
            message: result.connected ? 'Google Drive connected' : `Google Drive error: ${result.error}`,
        });
    } catch (error) {
        logger.error('Error checking Drive connection:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to check Google Drive connection',
        });
    }
}

/**
 * Create or get employee's Google Drive folder
 */
export async function createEmployeeFolder(req: Request, res: Response) {
    try {
        const { employeeId } = req.params;
        
        logger.info(`Creating Google Drive folder for employee: ${employeeId}`);

        const employee = await Employee.findById(employeeId);
        if (!employee) {
            logger.warn(`Employee not found: ${employeeId}`);
            return res.status(404).json({
                status: 'error',
                message: 'Employee not found',
            });
        }

        // Check if folder already exists
        if (employee.googleDriveFolderId) {
            logger.info(`Employee folder already exists: ${employee.googleDriveFolderId}`);
            return res.json({
                status: 'success',
                message: 'Employee folder already exists',
                data: {
                    folderId: employee.googleDriveFolderId,
                },
            });
        }

        // Determine if employee is an intern
        const isIntern = employee.role === 'intern';
        const staffId = employee.staffId || employee._id.toString();
        
        logger.info(`Creating folder for ${isIntern ? 'intern' : 'employee'}: ${employee.name} (${staffId})`);

        // Create the folder
        const folderId = await googleDriveService.getOrCreateEmployeeFolder(
            employee._id.toString(),
            employee.name,
            staffId,
            isIntern
        );
        
        logger.info(`Google Drive folder created successfully: ${folderId}`);

        // Update employee with folder ID
        employee.googleDriveFolderId = folderId;
        await employee.save();

        // Create standard subfolders for non-interns
        let subfolders = null;
        if (!isIntern) {
            subfolders = await googleDriveService.createEmployeeSubfolders(folderId);
            logger.info(`Subfolders created for employee`);
        }

        res.json({
            status: 'success',
            message: 'Employee folder created successfully',
            data: {
                folderId,
                subfolders,
            },
        });
    } catch (error: any) {
        logger.error('Error creating employee folder:', error);
        logger.error('Error stack:', error.stack);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create employee folder',
            error: error.message,
        });
    }
}

/**
 * Create or get week folder for diary entry
 */
export async function createWeekFolder(req: Request, res: Response) {
    try {
        const { diaryId } = req.params;

        const diary = await DiaryEntry.findById(diaryId).populate('internId');
        if (!diary) {
            return res.status(404).json({
                status: 'error',
                message: 'Diary entry not found',
            });
        }

        // Check if week folder already exists
        if (diary.googleDriveFolderId) {
            return res.json({
                status: 'success',
                message: 'Week folder already exists',
                data: {
                    folderId: diary.googleDriveFolderId,
                },
            });
        }

        const intern = diary.internId as any;
        if (!intern) {
            return res.status(404).json({
                status: 'error',
                message: 'Intern not found for this diary',
            });
        }

        // Get or create intern's root folder first
        let internFolderId = intern.googleDriveFolderId;
        if (!internFolderId) {
            const staffId = intern.staffId || intern.universityId || intern._id.toString();
            internFolderId = await googleDriveService.getOrCreateEmployeeFolder(
                intern._id.toString(),
                intern.name,
                staffId,
                true // isIntern
            );
            await Employee.findByIdAndUpdate(intern._id, { googleDriveFolderId: internFolderId });
        }

        // Create week folder
        const weekFolderId = await googleDriveService.getOrCreateWeekFolder(
            internFolderId,
            diary.weekNumber,
            diary.weekStartDate
        );

        // Update diary with folder ID
        diary.googleDriveFolderId = weekFolderId;
        await diary.save();

        res.json({
            status: 'success',
            message: 'Week folder created successfully',
            data: {
                folderId: weekFolderId,
                internFolderId,
            },
        });
    } catch (error) {
        logger.error('Error creating week folder:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create week folder',
        });
    }
}

/**
 * Upload file to a folder
 */
export async function uploadFile(req: Request, res: Response) {
    try {
        const { folderId } = req.params;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                status: 'error',
                message: 'No file provided',
            });
        }

        const result = await googleDriveService.uploadFile(
            file.originalname,
            file.mimetype,
            file.buffer,
            folderId
        );

        res.json({
            status: 'success',
            message: 'File uploaded successfully',
            data: result,
        });
    } catch (error) {
        logger.error('Error uploading file:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to upload file',
        });
    }
}

/**
 * List files in a folder
 */
export async function listFiles(req: Request, res: Response) {
    try {
        const { folderId } = req.params;

        const files = await googleDriveService.listFilesInFolder(folderId);

        res.json({
            status: 'success',
            data: {
                files,
                count: files.length,
            },
        });
    } catch (error) {
        logger.error('Error listing files:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to list files',
        });
    }
}

/**
 * Download a file
 */
export async function downloadFile(req: Request, res: Response) {
    try {
        const { fileId } = req.params;

        // Get file metadata first
        const metadata = await googleDriveService.getFileMetadata(fileId);
        if (!metadata) {
            return res.status(404).json({
                status: 'error',
                message: 'File not found',
            });
        }

        const content = await googleDriveService.downloadFile(fileId);

        res.setHeader('Content-Type', metadata.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${metadata.name}"`);
        res.send(content);
    } catch (error) {
        logger.error('Error downloading file:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to download file',
        });
    }
}

/**
 * Delete a file
 */
export async function deleteFileHandler(req: Request, res: Response) {
    try {
        const { fileId } = req.params;

        await googleDriveService.deleteFile(fileId);

        res.json({
            status: 'success',
            message: 'File deleted successfully',
        });
    } catch (error) {
        logger.error('Error deleting file:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete file',
        });
    }
}

/**
 * Get employee's folder and files
 */
export async function getEmployeeFiles(req: Request, res: Response) {
    try {
        const { employeeId } = req.params;

        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({
                status: 'error',
                message: 'Employee not found',
            });
        }

        if (!employee.googleDriveFolderId) {
            return res.json({
                status: 'success',
                data: {
                    folderId: null,
                    files: [],
                    message: 'No Google Drive folder configured for this employee',
                },
            });
        }

        const files = await googleDriveService.listFilesInFolder(employee.googleDriveFolderId);

        res.json({
            status: 'success',
            data: {
                folderId: employee.googleDriveFolderId,
                files,
            },
        });
    } catch (error) {
        logger.error('Error getting employee files:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get employee files',
        });
    }
}
