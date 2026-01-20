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
  regenerateSupervisorFeedback,
  downloadDiaryAsDoc,
  submitSignedDiary,
  downloadSignedPDF,
  uploadSignedDiary,
  uploadInternWeekSubmission
} from '../controllers/diary.controller';
import { protect } from '../middleware/auth.middleware';
import { upload, uploadMemory } from '../utils/fileUpload';

const router = Router();

// Intern routes
router.get('/current-week', protect, getCurrentWeekDiary);
router.get('/my-diaries', protect, getInternDiaries);
router.post('/update-tasks', protect, updateDailyTasks);
router.post('/update-generated-entry', protect, updateGeneratedEntry);
router.post('/generate-entry', protect, generateDailyEntry);
router.post('/submit-entry', protect, submitDailyEntry);
router.post('/submit-week', protect, submitWeekForFeedback);
router.post('/:diaryId/submit-document', protect, uploadMemory.single('file'), uploadInternWeekSubmission);
router.get('/:diaryId/download-signed', protect, downloadSignedPDF);

// Supervisor routes
router.get('/pending-review', protect, getPendingDiariesForSupervisor);
router.post('/:diaryId/regenerate-feedback', protect, regenerateSupervisorFeedback);
router.get('/:diaryId/download-doc', protect, downloadDiaryAsDoc);
router.post('/:diaryId/submit-signed', protect, submitSignedDiary);
router.post('/:diaryId/upload-signed', protect, uploadMemory.single('file'), uploadSignedDiary);

export default router;
