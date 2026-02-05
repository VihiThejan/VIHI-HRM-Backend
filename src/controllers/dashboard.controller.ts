import { Request, Response } from 'express';
import Employee from '../models/Employee.model';
import Leave from '../models/Leave.model';
import Payroll from '../models/Payroll.model';
import Attendance from '../models/Attendance.model';
import TimeTrackingSession from '../models/TimeTrackingSession.model';
import { logger } from '../config/logger';

interface PopulatedEmployee {
  _id: string;
  name: string;
  department: string;
}

interface ActivityItem {
  type: string;
  message: string;
  timestamp: Date;
  user?: string;
}

interface ComplianceAlertItem {
  _id: string;
  type: string;
  employeeName: string;
  department: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  dueDate?: Date;
}

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get total employees
    const totalEmployees = await Employee.countDocuments();
    const activeEmployees = await Employee.countDocuments({ status: 'active' });
    const inactiveEmployees = await Employee.countDocuments({ status: { $ne: 'active' } });

    // Get leave statistics
    const activeLeaves = await Leave.countDocuments({ 
      status: 'approved',
      startDate: { $lte: new Date() },
      endDate: { $gte: today }
    });
    
    const pendingLeaves = await Leave.countDocuments({ status: 'pending' });

    // Get payroll statistics
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const pendingPayroll = await Payroll.countDocuments({ 
      month: currentMonth.toString(),
      year: currentYear,
      status: { $in: ['pending', 'draft'] }
    });

    // Get today's attendance
    const todayAttendance = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: 'present'
    });

    // Get active interns (active time tracking sessions)
    const activeInterns = await TimeTrackingSession.countDocuments({
      status: 'active'
    });

    // Get total departments
    const departments = await Employee.distinct('department');
    const totalDepartments = departments.filter(dept => dept && dept.trim() !== '').length;

    res.status(200).json({
      status: 'success',
      data: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        activeLeaves,
        pendingLeaves,
        pendingPayroll,
        todayAttendance,
        activeInterns,
        totalDepartments
      }
    });
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

/**
 * Get recent activity
 */
export const getRecentActivity = async (req: Request, res: Response) => {
  try {
    const activities: ActivityItem[] = [];

    // Get recent leaves (last 5)
    const recentLeaves = await Leave.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate<{ employeeId: PopulatedEmployee }>('employeeId', 'name');

    recentLeaves.forEach(leave => {
      if (leave.employeeId) {
        activities.push({
          type: 'leave',
          message: `${leave.employeeId.name} requested ${leave.type} leave`,
          timestamp: leave.createdAt,
          user: leave.employeeId.name
        });
      }
    });

    // Get recent employees (last 5)
    const recentEmployees = await Employee.find()
      .sort({ createdAt: -1 })
      .limit(5);

    recentEmployees.forEach(emp => {
      activities.push({
        type: 'employee',
        message: `New employee ${emp.name} joined ${emp.department}`,
        timestamp: emp.createdAt,
        user: emp.name
      });
    });

    // Sort by timestamp and return latest 10
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.status(200).json({
      status: 'success',
      data: activities.slice(0, 10)
    });
  } catch (error) {
    logger.error('Error fetching recent activity:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch recent activity'
    });
  }
};

/**
 * Get upcoming birthdays (next 7 days)
 */
export const getUpcomingBirthdays = async (req: Request, res: Response) => {
  try {
    // Birthday feature disabled - dateOfBirth field not in Employee model
    // To enable: add dateOfBirth field to Employee model and update this function

    res.status(200).json({
      status: 'success',
      data: []
    });
  } catch (error) {
    logger.error('Error fetching upcoming birthdays:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch upcoming birthdays'
    });
  }
};

/**
 * Get upcoming performance reviews (next 30 days)
 */
export const getUpcomingReviews = async (req: Request, res: Response) => {
  try {
    // This would require a performance review model
    // For now, returning empty array as placeholder
    const today = new Date();
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);

    // Placeholder - would implement based on performance review model
    const upcomingReviews: never[] = [];

    res.status(200).json({
      status: 'success',
      data: upcomingReviews
    });
  } catch (error) {
    logger.error('Error fetching upcoming reviews:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch upcoming reviews'
    });
  }
};

/**
 * Get employees on leave today
 */
export const getOnLeaveToday = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const onLeaveToday = await Leave.find({
      status: 'approved',
      startDate: { $lte: today },
      endDate: { $gte: today }
    })
    .populate<{ employeeId: PopulatedEmployee }>('employeeId', 'name department')
    .sort({ startDate: 1 });

    const formattedLeaves = onLeaveToday.map(leave => ({
      _id: leave._id,
      employeeName: leave.employeeId.name,
      department: leave.employeeId.department,
      leaveType: leave.type,
      startDate: leave.startDate,
      endDate: leave.endDate
    }));

    res.status(200).json({
      status: 'success',
      data: formattedLeaves
    });
  } catch (error) {
    logger.error('Error fetching on leave today:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch employees on leave today'
    });
  }
};

/**
 * Get top performers this month
 */
export const getTopPerformers = async (req: Request, res: Response) => {
  try {
    // This would require a performance tracking system
    // For now, returning sample data based on attendance
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get employees with best attendance this month
    const attendanceRecords = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startOfMonth },
          status: 'present'
        }
      },
      {
        $group: {
          _id: '$employeeId',
          presentDays: { $sum: 1 }
        }
      },
      {
        $sort: { presentDays: -1 }
      },
      {
        $limit: 5
      }
    ]);

    const topPerformers = await Promise.all(
      attendanceRecords.map(async (record, index) => {
        const employee = await Employee.findById(record._id);
        if (!employee) return null;

        return {
          _id: employee._id,
          name: employee.name,
          department: employee.department,
          position: employee.position,
          performanceScore: 85 + (5 - index) * 3, // Mock score
          tasksCompleted: record.presentDays,
          rating: 4.0 + (5 - index) * 0.2
        };
      })
    );

    res.status(200).json({
      status: 'success',
      data: topPerformers.filter(p => p !== null)
    });
  } catch (error) {
    logger.error('Error fetching top performers:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch top performers'
    });
  }
};

/**
 * Get department-wise statistics
 */
export const getDepartmentStats = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const departments = await Employee.distinct('department');
    
    const departmentStats = await Promise.all(
      departments
        .filter(dept => dept && dept.trim() !== '')
        .map(async (dept) => {
          const employeeCount = await Employee.countDocuments({ department: dept });
          const activeEmployees = await Employee.countDocuments({ 
            department: dept, 
            status: 'active' 
          });

          // Get employees on leave in this department
          const deptEmployees = await Employee.find({ department: dept }).select('_id');
          const deptEmployeeIds = deptEmployees.map(e => e._id);

          const onLeave = await Leave.countDocuments({
            employeeId: { $in: deptEmployeeIds },
            status: 'approved',
            startDate: { $lte: today },
            endDate: { $gte: today }
          });

          return {
            _id: dept,
            name: dept,
            employeeCount,
            activeEmployees,
            onLeave,
            averagePerformance: 75 + Math.random() * 20 // Mock performance score
          };
        })
    );

    res.status(200).json({
      status: 'success',
      data: departmentStats.sort((a, b) => b.employeeCount - a.employeeCount)
    });
  } catch (error) {
    logger.error('Error fetching department stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch department statistics'
    });
  }
};

/**
 * Get time tracking summary
 */
export const getTimeTrackingSummary = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all time tracking sessions for today
    const trackingSessions = await TimeTrackingSession.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate<{ internId: PopulatedEmployee }>('internId', 'name');

    let totalHoursToday = 0;
    const trackerHours: { [key: string]: { name: string; hours: number } } = {};
    let activeTrackers = 0;

    trackingSessions.forEach(session => {
      const hours = session.totalActiveSeconds / 3600;
      totalHoursToday += hours;

      const internName = session.internId?.name || 'Unknown';
      if (!trackerHours[internName]) {
        trackerHours[internName] = { name: internName, hours: 0 };
      }
      trackerHours[internName].hours += hours;

      if (session.status === 'active') {
        activeTrackers++;
      }
    });

    const topTrackers = Object.values(trackerHours)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);

    const averageHoursPerEmployee = trackingSessions.length > 0 
      ? totalHoursToday / trackingSessions.length 
      : 0;

    res.status(200).json({
      status: 'success',
      data: {
        totalHoursToday,
        averageHoursPerEmployee,
        activeTrackers,
        topTrackers
      }
    });
  } catch (error) {
    logger.error('Error fetching time tracking summary:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch time tracking summary'
    });
  }
};

/**
 * Get compliance alerts
 */
export const getComplianceAlerts = async (req: Request, res: Response) => {
  try {
    const alerts: ComplianceAlertItem[] = [];
    const today = new Date();

    // Check for employees missing basic information
    const employeesMissingInfo = await Employee.find({
      $or: [
        { email: { $exists: false } },
        { email: '' },
        { phone: { $exists: false } },
        { phone: '' },
        { emergencyContact: { $exists: false } }
      ],
      status: 'active'
    }).select('name department email phone emergencyContact');

    employeesMissingInfo.forEach(emp => {
      const missing = [];
      if (!emp.email) missing.push('email');
      if (!emp.phone) missing.push('phone');
      if (!emp.emergencyContact || !emp.emergencyContact.name) missing.push('emergency contact');

      if (missing.length > 0) {
        alerts.push({
          _id: `${emp._id}_missing_info`,
          type: 'Missing Information',
          employeeName: emp.name,
          department: emp.department,
          message: `Missing ${missing.join(', ')}`,
          severity: 'medium' as const
        });
      }
    });

    // Check for employees without date of birth
    const employeesNoDOB = await Employee.find({
      dateOfBirth: { $exists: false },
      status: 'active'
    }).select('name department').limit(5);

    employeesNoDOB.forEach(emp => {
      alerts.push({
        _id: `${emp._id}_no_dob`,
        type: 'Missing DOB',
        employeeName: emp.name,
        department: emp.department,
        message: 'Date of birth not provided',
        severity: 'low' as const
      });
    });

    // Check for pending leave approvals older than 3 days
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);

    const oldPendingLeaves = await Leave.find({
      status: 'pending',
      createdAt: { $lt: threeDaysAgo }
    })
    .populate<{ employeeId: PopulatedEmployee }>('employeeId', 'name department')
    .limit(5);

    oldPendingLeaves.forEach(leave => {
      const daysOld = Math.floor((today.getTime() - new Date(leave.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      alerts.push({
        _id: `${leave._id}_pending`,
        type: 'Pending Approval',
        employeeName: leave.employeeId.name,
        department: leave.employeeId.department,
        message: `Leave request pending for ${daysOld} days`,
        severity: daysOld > 5 ? 'high' : 'medium',
        dueDate: leave.startDate
      });
    });

    // Sort alerts by severity
    const severityOrder = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    res.status(200).json({
      status: 'success',
      data: alerts
    });
  } catch (error) {
    logger.error('Error fetching compliance alerts:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch compliance alerts'
    });
  }
};
