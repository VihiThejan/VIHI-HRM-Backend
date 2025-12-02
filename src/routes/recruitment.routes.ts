import { Router } from 'express';
import {
  getJobPostings,
  getJobPosting,
  createJobPosting,
  updateJobPosting,
  deleteJobPosting,
  getApplicants,
  getApplicant,
  createApplicant,
  updateApplicant,
  deleteApplicant,
} from '../controllers/recruitment.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { validateId, validateJobPosting } from '../middleware/validation.middleware';
import { upload } from '../utils/fileUpload';

const router = Router();

router.use(protect);

// Job Postings
router
  .route('/jobs')
  .get(getJobPostings)
  .post(authorize('manager', 'admin', 'ceo'), validateJobPosting, createJobPosting);

router
  .route('/jobs/:id')
  .get(validateId, getJobPosting)
  .put(validateId, authorize('manager', 'admin', 'ceo'), updateJobPosting)
  .delete(validateId, authorize('admin', 'ceo'), deleteJobPosting);

// Applicants
router
  .route('/applicants')
  .get(authorize('manager', 'admin', 'ceo'), getApplicants)
  .post(upload.single('resume'), createApplicant);

router
  .route('/applicants/:id')
  .get(validateId, authorize('manager', 'admin', 'ceo'), getApplicant)
  .put(validateId, authorize('manager', 'admin', 'ceo'), updateApplicant)
  .delete(validateId, authorize('admin', 'ceo'), deleteApplicant);

export default router;
