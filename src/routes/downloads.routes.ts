import express from 'express';
import { protect } from '../middleware/auth.middleware';
import {
    downloadTimeTracker,
    getTimeTrackerInfo,
} from '../controllers/downloads.controller';

const router = express.Router();

// Get app info (public - no auth required for checking availability)
router.get('/time-tracker/info', getTimeTrackerInfo);

// Download requires authentication
router.get('/time-tracker', protect, downloadTimeTracker);

export default router;
