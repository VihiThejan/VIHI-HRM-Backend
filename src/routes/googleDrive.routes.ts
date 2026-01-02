import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../middleware/auth.middleware';
import * as googleDriveController from '../controllers/googleDrive.controller';

const router = express.Router();

// Configure multer for file uploads (memory storage for Drive upload)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
});

// All routes require authentication
router.use(protect);

// Check Drive connection status (admin only)
router.get('/status', authorize('admin', 'ceo'), googleDriveController.checkConnection);

// Create/get employee folder
router.post(
    '/folders/employee/:employeeId',
    authorize('admin', 'manager', 'ceo'),
    googleDriveController.createEmployeeFolder
);

// Create/get week folder for diary
router.post(
    '/folders/week/:diaryId',
    authorize('admin', 'manager', 'ceo'),
    googleDriveController.createWeekFolder
);

// Get employee's files
router.get(
    '/employee/:employeeId/files',
    authorize('admin', 'manager', 'ceo'),
    googleDriveController.getEmployeeFiles
);

// Upload file to folder
router.post(
    '/upload/:folderId',
    authorize('admin', 'manager', 'ceo'),
    upload.single('file'),
    googleDriveController.uploadFile
);

// List files in folder
router.get('/files/:folderId', authorize('admin', 'manager', 'ceo'), googleDriveController.listFiles);

// Download file
router.get('/download/:fileId', authorize('admin', 'manager', 'ceo', 'employee', 'intern'), googleDriveController.downloadFile);

// Delete file
router.delete('/files/:fileId', authorize('admin', 'ceo'), googleDriveController.deleteFileHandler);

export default router;
