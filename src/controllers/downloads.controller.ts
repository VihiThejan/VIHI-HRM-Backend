import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../config/logger';

// Downloads directory path
const DOWNLOADS_DIR = path.join(__dirname, '../../downloads');

/**
 * Get Time Tracker desktop app installer
 * Downloads the VIHI-TimeTracker-Setup.exe file
 */
export const downloadTimeTracker = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const installerPath = path.join(DOWNLOADS_DIR, 'VIHI-TimeTracker-Setup.exe');

        // Check if file exists
        if (!fs.existsSync(installerPath)) {
            logger.warn('Time Tracker installer not found at:', installerPath);
            res.status(404).json({
                status: 'error',
                message: 'Installer not found. Please contact administrator.',
            });
            return;
        }

        // Get file stats for logging
        const stats = fs.statSync(installerPath);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

        logger.info(`Downloading Time Tracker installer (${fileSizeInMB} MB) for user: ${req.user?.id || 'anonymous'}`);

        // Set headers for file download
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', 'attachment; filename="VIHI-TimeTracker-Setup.exe"');
        res.setHeader('Content-Length', stats.size);

        // Stream the file to response
        const fileStream = fs.createReadStream(installerPath);
        fileStream.pipe(res);

        fileStream.on('error', (error) => {
            logger.error('Error streaming installer file:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    status: 'error',
                    message: 'Error downloading file',
                });
            }
        });

    } catch (error) {
        logger.error('Error in downloadTimeTracker:', error);
        next(error);
    }
};

/**
 * Get Time Tracker app information
 * Returns version, download size, and system requirements
 */
export const getTimeTrackerInfo = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const installerPath = path.join(DOWNLOADS_DIR, 'VIHI-TimeTracker-Setup.exe');

        let fileSize = 0;
        let isAvailable = false;

        if (fs.existsSync(installerPath)) {
            const stats = fs.statSync(installerPath);
            fileSize = stats.size;
            isAvailable = true;
        }

        res.status(200).json({
            status: 'success',
            data: {
                name: 'VIHI Time Tracker',
                version: '1.0.0',
                platform: 'Windows',
                isAvailable,
                fileSize,
                fileSizeMB: (fileSize / (1024 * 1024)).toFixed(2),
                systemRequirements: {
                    os: 'Windows 10 or later',
                    memory: '512 MB RAM',
                    disk: '100 MB free space',
                },
                features: [
                    'Automatic time tracking',
                    'Mouse activity monitoring',
                    'Idle detection (5 min timeout)',
                    'Real-time sync with web interface',
                    'System tray integration',
                ],
                downloadUrl: '/api/downloads/time-tracker',
            },
        });
    } catch (error) {
        logger.error('Error in getTimeTrackerInfo:', error);
        next(error);
    }
};
