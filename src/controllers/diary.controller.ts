import { Request, Response, NextFunction } from 'express';
import DiaryEntry, { ITask } from '../models/DiaryEntry.model';
import Employee from '../models/Employee.model';
import { generateDiaryEntry, generateWeeklySupervisorFeedback } from '../services/gemini.service';
import { generateDiaryDocument, generateSignedDiaryPDF } from '../utils/documentGenerator';
import { logger } from '../config/logger';
import { AuthRequest } from '../middleware/auth.middleware';

// Get or create current week's diary
export const getCurrentWeekDiary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const internId = req.user?.id;

    if (!internId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify user is an intern
    const intern = await Employee.findById(internId);
    if (!intern || intern.position !== 'Intern') {
      return res.status(403).json({ message: 'Access denied. Only interns can access diary entries.' });
    }

    const monday = (DiaryEntry as any).getCurrentWeekMonday();
    const friday = new Date(monday);
    friday.setDate(friday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);

    let diary = await DiaryEntry.findOne({
      internId,
      weekStartDate: monday
    });

    // Create new diary if doesn't exist
    if (!diary) {
      const weekNumber = await (DiaryEntry as any).calculateWeekNumber(internId, monday);
      
      // Initialize all weekday entries
      const entries = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date(monday);
        date.setDate(date.getDate() + i);
        entries.push({
          date,
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][i],
          tasks: [],
          generatedEntry: '',
          status: 'draft'
        });
      }

      diary = await DiaryEntry.create({
        internId,
        weekStartDate: monday,
        weekEndDate: friday,
        weekNumber,
        entries,
        weeklyStatus: 'in-progress'
      });
    }

    res.json(diary);
  } catch (error) {
    logger.error('Error getting current week diary:', error);
    next(error);
  }
};

// Add or update tasks for a specific day
export const updateDailyTasks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const internId = req.user?.id;
    const { date, tasks } = req.body;

    if (!internId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!date || !tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ message: 'Date and tasks array are required' });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Get the Monday of the week for this date
    const dayOfWeek = targetDate.getDay();
    const diff = targetDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(targetDate);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);

    const diary = await DiaryEntry.findOne({
      internId,
      weekStartDate: monday
    });

    if (!diary) {
      return res.status(404).json({ message: 'Diary entry not found for this week' });
    }

    // Find the specific day entry
    const dayEntry = diary.entries.find(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === targetDate.getTime();
    });

    if (!dayEntry) {
      return res.status(404).json({ message: 'Day entry not found' });
    }

    // Update tasks
    dayEntry.tasks = tasks;
    dayEntry.status = 'edited';

    await diary.save();

    res.json({ message: 'Tasks updated successfully', diary });
  } catch (error) {
    logger.error('Error updating daily tasks:', error);
    next(error);
  }
};

// Update generated diary entry
export const updateGeneratedEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const internId = req.user?.id;
    const { date, generatedEntry } = req.body;

    if (!date || !generatedEntry) {
      return res.status(400).json({ message: 'Date and generated entry are required' });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Get the Monday of the week for this date
    const dayOfWeek = targetDate.getDay();
    const diff = targetDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(targetDate);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);

    const diary = await DiaryEntry.findOne({
      internId,
      weekStartDate: monday
    });

    if (!diary) {
      return res.status(404).json({ message: 'Diary entry not found for this week' });
    }

    // Find the specific day entry
    const dayEntry = diary.entries.find(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === targetDate.getTime();
    });

    if (!dayEntry) {
      return res.status(404).json({ message: 'Day entry not found' });
    }

    // Don't allow editing after submission
    if (dayEntry.status === 'submitted') {
      return res.status(400).json({ message: 'Cannot edit submitted entries' });
    }

    // Update generated entry
    dayEntry.generatedEntry = generatedEntry;

    await diary.save();

    res.json({ message: 'Diary entry updated successfully', diary });
  } catch (error) {
    logger.error('Error updating generated entry:', error);
    next(error);
  }
};

// Generate AI diary entry for a specific day
export const generateDailyEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const internId = req.user?.id;
    const { date } = req.body;

    if (!internId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Get the Monday of the week
    const dayOfWeek = targetDate.getDay();
    const diff = targetDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(targetDate);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);

    const diary = await DiaryEntry.findOne({
      internId,
      weekStartDate: monday
    }).populate('internId', 'name universityId university course');

    if (!diary) {
      return res.status(404).json({ message: 'Diary entry not found for this week' });
    }

    const dayEntry = diary.entries.find(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === targetDate.getTime();
    });

    if (!dayEntry) {
      return res.status(404).json({ message: 'Day entry not found' });
    }

    if (!dayEntry.tasks || dayEntry.tasks.length === 0) {
      return res.status(400).json({ message: 'Please add tasks before generating diary entry' });
    }

    // Generate AI diary entry
    const generatedEntry = await generateDiaryEntry(
      dayEntry.tasks,
      dayEntry.dayOfWeek,
      (diary.internId as any).name,
      (diary.internId as any).university,
      (diary.internId as any).course
    );

    dayEntry.generatedEntry = generatedEntry;

    await diary.save();

    res.json({ message: 'Diary entry generated successfully', generatedEntry, diary });
  } catch (error) {
    logger.error('Error generating daily entry:', error);
    next(error);
  }
};

// Submit a daily entry
export const submitDailyEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const internId = req.user?.id;
    const { date } = req.body;

    if (!internId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const dayOfWeek = targetDate.getDay();
    const diff = targetDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(targetDate);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);

    const diary = await DiaryEntry.findOne({
      internId,
      weekStartDate: monday
    });

    if (!diary) {
      return res.status(404).json({ message: 'Diary entry not found for this week' });
    }

    const dayEntry = diary.entries.find(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === targetDate.getTime();
    });

    if (!dayEntry) {
      return res.status(404).json({ message: 'Day entry not found' });
    }

    // Check if tasks exist
    if (!dayEntry.tasks || dayEntry.tasks.length === 0) {
      return res.status(400).json({ message: 'Please add tasks before submitting' });
    }

    dayEntry.status = 'submitted';
    dayEntry.submittedAt = new Date();

    await diary.save();

    res.json({ message: 'Daily entry submitted successfully', diary });
  } catch (error) {
    logger.error('Error submitting daily entry:', error);
    next(error);
  }
};

// Submit all entries for supervisor feedback
export const submitWeekForFeedback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const internId = req.user?.id;
    const { weekStartDate } = req.body;

    if (!internId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const monday = weekStartDate ? new Date(weekStartDate) : (DiaryEntry as any).getCurrentWeekMonday();

    const diary = await DiaryEntry.findOne({
      internId,
      weekStartDate: monday
    }).populate('internId', 'name universityId university course supervisor');

    if (!diary) {
      return res.status(404).json({ message: 'Diary entry not found for this week' });
    }

    // Check if all entries are submitted
    if (!(diary as any).areAllEntriesSubmitted()) {
      return res.status(400).json({ 
        message: 'All weekday entries must be submitted before requesting feedback',
        completionPercentage: (diary as any).getWeekCompletionPercentage()
      });
    }

    // Generate AI supervisor feedback
    const intern = diary.internId as any;
    const generatedFeedback = await generateWeeklySupervisorFeedback(
      diary.entries.map(entry => ({
        day: entry.dayOfWeek,
        tasks: entry.tasks,
        entry: entry.generatedEntry
      })),
      intern.name,
      intern.university,
      intern.course,
      diary.weekNumber
    );

    diary.generatedFeedback = generatedFeedback;
    diary.feedbackGeneratedAt = new Date();
    diary.weeklyStatus = 'feedback-generated';
    diary.submittedForFeedbackAt = new Date();

    await diary.save();

    res.json({ 
      message: 'Week submitted for feedback successfully', 
      generatedFeedback,
      diary 
    });
  } catch (error) {
    logger.error('Error submitting week for feedback:', error);
    next(error);
  }
};

// Get all diaries for an intern
export const getInternDiaries = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const internId = req.user?.id;

    if (!internId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const diaries = await DiaryEntry.find({ internId })
      .sort({ weekStartDate: -1 })
      .populate('internId', 'name universityId university course')
      .populate('supervisorSignature.signedBy', 'name staffId');

    res.json(diaries);
  } catch (error) {
    logger.error('Error getting intern diaries:', error);
    next(error);
  }
};

// Get diaries pending supervisor review (for supervisors)
export const getPendingDiariesForSupervisor = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const supervisorId = req.user?.id;

    if (!supervisorId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find all interns supervised by this supervisor
    const supervisedInterns = await Employee.find({
      position: 'Intern',
      supervisor: supervisorId
    }).select('_id');

    const internIds = supervisedInterns.map(intern => intern._id);

    const diaries = await DiaryEntry.find({
      internId: { $in: internIds },
      weeklyStatus: { $in: ['feedback-generated', 'signed'] }
    })
      .sort({ submittedForFeedbackAt: -1 })
      .populate('internId', 'name universityId university course staffId');

    res.json(diaries);
  } catch (error) {
    logger.error('Error getting pending diaries:', error);
    next(error);
  }
};

// Download diary as DOC (for supervisor)
export const downloadDiaryAsDoc = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { diaryId } = req.params;
    const supervisorId = req.user?.id;

    if (!supervisorId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const diary = await DiaryEntry.findById(diaryId)
      .populate('internId', 'name universityId university course staffId');

    if (!diary) {
      return res.status(404).json({ message: 'Diary not found' });
    }

    // Verify supervisor has access
    const intern = await Employee.findById(diary.internId);
    if (!intern || intern.supervisor?.toString() !== supervisorId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Generate document
    const docBuffer = await generateDiaryDocument(diary);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Intern_Diary_Week${diary.weekNumber}_${(diary.internId as any).name.replace(/\s/g, '_')}.docx"`);
    res.send(docBuffer);
  } catch (error) {
    logger.error('Error downloading diary as DOC:', error);
    next(error);
  }
};

// Submit signed diary (for supervisor)
export const submitSignedDiary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { diaryId } = req.params;
    const supervisorId = req.user?.id;
    const { signatureData, comments } = req.body;

    if (!supervisorId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!signatureData) {
      return res.status(400).json({ message: 'Digital signature is required' });
    }

    const diary = await DiaryEntry.findById(diaryId)
      .populate('internId', 'name universityId university course staffId');

    if (!diary) {
      return res.status(404).json({ message: 'Diary not found' });
    }

    // Verify supervisor has access
    const intern = await Employee.findById(diary.internId);
    if (!intern || intern.supervisor?.toString() !== supervisorId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Generate signed PDF
    const { signatureUrl, documentUrl } = await generateSignedDiaryPDF(diary, signatureData, supervisorId);

    // Update diary
    diary.supervisorSignature = {
      signedBy: supervisorId as any,
      signedAt: new Date(),
      signatureUrl,
      documentUrl
    };
    diary.supervisorComments = comments;
    diary.weeklyStatus = 'completed';

    await diary.save();

    res.json({ 
      message: 'Diary signed and submitted successfully', 
      diary 
    });
  } catch (error) {
    logger.error('Error submitting signed diary:', error);
    next(error);
  }
};

// Download final signed PDF (for intern)
export const downloadSignedPDF = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { diaryId } = req.params;
    const internId = req.user?.id;

    if (!internId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const diary = await DiaryEntry.findById(diaryId);

    if (!diary) {
      return res.status(404).json({ message: 'Diary not found' });
    }

    if (diary.internId.toString() !== internId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!diary.supervisorSignature?.documentUrl) {
      return res.status(404).json({ message: 'Signed document not available yet' });
    }

    // Mark as downloaded
    if (!diary.downloadedByIntern) {
      diary.downloadedByIntern = true;
      diary.downloadedAt = new Date();
      await diary.save();
    }

    // Return the document URL
    res.json({ 
      documentUrl: diary.supervisorSignature.documentUrl,
      message: 'Document ready for download'
    });
  } catch (error) {
    logger.error('Error downloading signed PDF:', error);
    next(error);
  }
};
