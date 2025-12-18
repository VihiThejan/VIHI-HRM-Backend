import { Router } from 'express';
import {
  getCurrentWeekDiary,
  updateDailyTasks,
  updateGeneratedEntry,
  generateDailyEntry,
  submitDailyEntry,
  submitWeekForFeedback,
  getInternDiaries,
  getPendingDiariesForSupervisor,
  downloadDiaryAsDoc,
  submitSignedDiary,
  downloadSignedPDF
} from '../controllers/diary.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// Intern routes
router.get('/current-week', protect, getCurrentWeekDiary);
router.get('/my-diaries', protect, getInternDiaries);
router.post('/update-tasks', protect, updateDailyTasks);
router.post('/update-generated-entry', protect, updateGeneratedEntry);
router.post('/generate-entry', protect, generateDailyEntry);
router.post('/submit-entry', protect, submitDailyEntry);
router.post('/submit-week', protect, submitWeekForFeedback);
router.get('/:diaryId/download-signed', protect, downloadSignedPDF);

// Supervisor routes
router.get('/pending-review', protect, getPendingDiariesForSupervisor);
router.get('/:diaryId/download-doc', protect, downloadDiaryAsDoc);
router.post('/:diaryId/submit-signed', protect, submitSignedDiary);

export default router;
