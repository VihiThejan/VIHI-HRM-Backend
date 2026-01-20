import express from 'express';
import { protect } from '../middleware/auth.middleware';
import {
  startSession,
  receiveHeartbeat,
  endSession,
  getActiveSession,
  getTodaySummary,
  getSessionHistory,
  getWeeklySummary,
  generateLaunchToken,
} from '../controllers/timeTracking.controller';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Desktop app endpoints
router.post('/start', startSession);
router.post('/heartbeat', receiveHeartbeat);
router.post('/end', endSession);

// Get active session status
router.get('/active', getActiveSession);

// Generate launch token for desktop app
router.get('/launch-token', generateLaunchToken);

// Get summaries (own or with permission for others)
router.get('/today', getTodaySummary);
router.get('/today/:internId', getTodaySummary);

router.get('/history', getSessionHistory);
router.get('/history/:internId', getSessionHistory);

router.get('/weekly', getWeeklySummary);
router.get('/weekly/:internId', getWeeklySummary);

export default router;
