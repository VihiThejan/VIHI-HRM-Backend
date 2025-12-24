import { Response, NextFunction } from 'express';
import Intern from '../models/Intern.model';
import Employee from '../models/Employee.model';
import { AuthRequest } from '../middleware/auth.middleware';

// @desc    Create new intern
// @route   POST /api/interns/register
// @access  Private (Admin, Manager)
export const createIntern = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      department,
      designation,
      universityId,
      supervisor,
      university,
      course,
      academicYear,
      internshipType,
      internshipStartDate,
      internshipEndDate,
      weeklyHoursLimit,
      stipend,
      nic,
      passportNo,
    } = req.body;

    // Validate required fields
    if (!name || !email || !universityId || !supervisor || !university) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, email, university ID, supervisor, and university are required',
      });
    }

    // Check if email already exists
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already exists',
      });
    }

    // Check if universityId already exists
    const existingIntern = await Intern.findOne({ universityId });
    if (existingIntern) {
      return res.status(400).json({
        status: 'error',
        message: 'University ID already exists',
      });
    }

    // Verify supervisor exists and is not an intern
    const supervisorEmployee = await Employee.findById(supervisor);
    if (!supervisorEmployee) {
      return res.status(404).json({
        status: 'error',
        message: 'Supervisor not found',
      });
    }

    if (supervisorEmployee.role === 'intern') {
      return res.status(400).json({
        status: 'error',
        message: 'Interns cannot be supervisors',
      });
    }

    // Generate staff ID for intern
    const lastIntern = await Intern.findOne({ staffId: { $regex: '^INT', $exists: true } })
      .sort({ staffId: -1 })
      .limit(1);

    let counter = 1;
    if (lastIntern && lastIntern.staffId) {
      const match = lastIntern.staffId.match(/\d+$/);
      if (match) {
        counter = parseInt(match[0]) + 1;
      }
    }

    const staffId = `INT${String(counter).padStart(6, '0')}`;
    const temporaryPassword = staffId;

    // Create intern
    const intern = await Intern.create({
      name,
      email,
      password: temporaryPassword,
      phone,
      address,
      department,
      designation: designation || 'Intern',
      position: 'Intern',
      role: 'intern',
      staffId,
      universityId,
      supervisor,
      university,
      course,
      academicYear,
      internshipType: internshipType || 'academic',
      internshipStartDate: internshipStartDate || new Date(),
      internshipEndDate,
      weeklyHoursLimit: weeklyHoursLimit || 40,
      stipend: stipend || 0,
      nic,
      passportNo,
      passwordResetRequired: true,
      status: 'active',
    });

    res.status(201).json({
      status: 'success',
      data: {
        intern: {
          id: intern._id,
          name: intern.name,
          email: intern.email,
          staffId: intern.staffId,
          universityId: intern.universityId,
          university: intern.university,
        },
        temporaryPassword,
      },
      message: 'Intern created successfully. Please share the temporary password.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all interns
// @route   GET /api/interns/list
// @access  Private
export const getAllInterns = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const query: any = { role: 'intern' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { universityId: { $regex: search, $options: 'i' } },
        { staffId: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Intern.countDocuments(query);
    const interns = await Intern.find(query)
      .select('-password')
      .populate('supervisor', 'name staffId designation position')
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: interns,
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

// @desc    Get single intern
// @route   GET /api/interns/:id/details
// @access  Private
export const getIntern = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const intern = await Intern.findById(req.params.id)
      .select('-password')
      .populate('supervisor', 'name staffId designation position email phone');

    if (!intern) {
      return res.status(404).json({
        status: 'error',
        message: 'Intern not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: intern,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update intern
// @route   PUT /api/interns/:id
// @access  Private
export const updateIntern = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const intern = await Intern.findById(req.params.id);

    if (!intern) {
      return res.status(404).json({
        status: 'error',
        message: 'Intern not found',
      });
    }

    // Update fields
    const allowedUpdates = [
      'name',
      'phone',
      'address',
      'department',
      'designation',
      'university',
      'course',
      'academicYear',
      'internshipType',
      'internshipStartDate',
      'internshipEndDate',
      'weeklyHoursLimit',
      'stipend',
      'supervisor',
      'status',
      'evaluationCriteria',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        (intern as any)[field] = req.body[field];
      }
    });

    await intern.save();

    const updatedIntern = await Intern.findById(intern._id)
      .select('-password')
      .populate('supervisor', 'name staffId designation position');

    res.status(200).json({
      status: 'success',
      data: updatedIntern,
      message: 'Intern updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete intern
// @route   DELETE /api/interns/:id
// @access  Private (Admin)
export const deleteIntern = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const intern = await Intern.findById(req.params.id);

    if (!intern) {
      return res.status(404).json({
        status: 'error',
        message: 'Intern not found',
      });
    }

    await intern.deleteOne();

    res.status(200).json({
      status: 'success',
      message: 'Intern deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Evaluate intern
// @route   POST /api/interns/:id/evaluate
// @access  Private (Supervisor, Manager, Admin)
export const evaluateIntern = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { technicalSkills, communication, teamwork, punctuality } = req.body;

    const intern = await Intern.findById(req.params.id);

    if (!intern) {
      return res.status(404).json({
        status: 'error',
        message: 'Intern not found',
      });
    }

    // Calculate overall rating
    const scores = [technicalSkills, communication, teamwork, punctuality].filter(
      (score) => score !== undefined
    );
    const overallRating = scores.length > 0
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 0;

    intern.evaluationCriteria = {
      technicalSkills,
      communication,
      teamwork,
      punctuality,
      overallRating,
    };

    await intern.save();

    res.status(200).json({
      status: 'success',
      data: intern.evaluationCriteria,
      message: 'Intern evaluated successfully',
    });
  } catch (error) {
    next(error);
  }
};
