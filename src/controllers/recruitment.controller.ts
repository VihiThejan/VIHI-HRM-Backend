import { Response, NextFunction } from 'express';
import JobPosting from '../models/JobPosting.model';
import Applicant from '../models/Applicant.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { upload } from '../utils/fileUpload';

// ============ JOB POSTINGS ============

// @desc    Get all job postings
// @route   GET /api/recruitment/jobs
// @access  Private
export const getJobPostings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const department = req.query.department as string;

    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (department) {
      query.department = department;
    }

    const total = await JobPosting.countDocuments(query);
    const jobs = await JobPosting.find(query)
      .populate('createdBy', 'name email')
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ postedDate: -1 });

    res.status(200).json({
      status: 'success',
      data: jobs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single job posting
// @route   GET /api/recruitment/jobs/:id
// @access  Private
export const getJobPosting = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const job = await JobPosting.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job posting not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create job posting
// @route   POST /api/recruitment/jobs
// @access  Private (Manager/Admin/CEO)
export const createJobPosting = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description, requirements, department, location, salary, closingDate } = req.body;

    const job = await JobPosting.create({
      title,
      description,
      requirements: requirements || [],
      department,
      location,
      salary,
      closingDate,
      createdBy: req.user.id,
    });

    const populatedJob = await JobPosting.findById(job._id)
      .populate('createdBy', 'name email');

    res.status(201).json({
      status: 'success',
      data: populatedJob,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update job posting
// @route   PUT /api/recruitment/jobs/:id
// @access  Private (Manager/Admin/CEO)
export const updateJobPosting = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description, requirements, department, location, salary, status, closingDate } = req.body;

    const job = await JobPosting.findByIdAndUpdate(
      req.params.id,
      { title, description, requirements, department, location, salary, status, closingDate },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job posting not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete job posting
// @route   DELETE /api/recruitment/jobs/:id
// @access  Private (Admin/CEO)
export const deleteJobPosting = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const job = await JobPosting.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job posting not found',
      });
    }

    // Check if there are applicants
    const applicantCount = await Applicant.countDocuments({ jobId: req.params.id });
    if (applicantCount > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete job posting with existing applicants. Close it instead.',
      });
    }

    await JobPosting.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Job posting deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ============ APPLICANTS ============

// @desc    Get all applicants
// @route   GET /api/recruitment/applicants
// @access  Private (Manager/Admin/CEO)
export const getApplicants = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const jobId = req.query.jobId as string;

    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (jobId) {
      query.jobId = jobId;
    }

    const total = await Applicant.countDocuments(query);
    const applicants = await Applicant.find(query)
      .populate('jobId', 'title department')
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ appliedDate: -1 });

    res.status(200).json({
      status: 'success',
      data: applicants,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single applicant
// @route   GET /api/recruitment/applicants/:id
// @access  Private (Manager/Admin/CEO)
export const getApplicant = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const applicant = await Applicant.findById(req.params.id)
      .populate('jobId', 'title department location salary');

    if (!applicant) {
      return res.status(404).json({
        status: 'error',
        message: 'Applicant not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: applicant,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create applicant (apply for job)
// @route   POST /api/recruitment/applicants
// @access  Public (with file upload)
export const createApplicant = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { jobId, name, email, phone, coverLetter } = req.body;

    // Check if job exists and is open
    const job = await JobPosting.findById(jobId);
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job posting not found',
      });
    }

    if (job.status !== 'open') {
      return res.status(400).json({
        status: 'error',
        message: 'This job posting is not accepting applications',
      });
    }

    // Check if already applied
    const existingApplicant = await Applicant.findOne({ jobId, email });
    if (existingApplicant) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already applied for this position',
      });
    }

    // Get resume URL from uploaded file
    const resumeUrl = req.file ? `/uploads/${req.file.filename}` : '';

    if (!resumeUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'Resume is required',
      });
    }

    const applicant = await Applicant.create({
      jobId,
      name,
      email,
      phone,
      resumeUrl,
      coverLetter,
    });

    const populatedApplicant = await Applicant.findById(applicant._id)
      .populate('jobId', 'title department');

    res.status(201).json({
      status: 'success',
      data: populatedApplicant,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update applicant status
// @route   PUT /api/recruitment/applicants/:id
// @access  Private (Manager/Admin/CEO)
export const updateApplicant = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, notes, interviewDate } = req.body;

    const applicant = await Applicant.findByIdAndUpdate(
      req.params.id,
      { status, notes, interviewDate },
      { new: true, runValidators: true }
    ).populate('jobId', 'title department');

    if (!applicant) {
      return res.status(404).json({
        status: 'error',
        message: 'Applicant not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: applicant,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete applicant
// @route   DELETE /api/recruitment/applicants/:id
// @access  Private (Admin/CEO)
export const deleteApplicant = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const applicant = await Applicant.findById(req.params.id);

    if (!applicant) {
      return res.status(404).json({
        status: 'error',
        message: 'Applicant not found',
      });
    }

    await Applicant.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Applicant deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
