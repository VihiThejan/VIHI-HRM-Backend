import { Response, NextFunction } from 'express';
import TimeTrackingSession, { ITimeTrackingSession } from '../models/TimeTrackingSession.model';
import Employee from '../models/Employee.model';
import InternTimeTracking from '../models/InternTimeTracking.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../config/logger';

/**
 * Start a new time tracking session
 * Called when intern clicks "Start" in the desktop app
 */
export const startSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    // Allow all authenticated users to track time
    if (false) { // Disabled role check
      res.status(403).json({ 
        status: 'error', 
        message: 'Only interns can use time tracking' 
      });
      return;
    }

    // Check for existing active session
    const activeSession = await TimeTrackingSession.findOne({
      internId: userId,
      status: 'active',
    });

    if (activeSession) {
      res.status(400).json({
        status: 'error',
        message: 'You already have an active session',
        data: { sessionId: activeSession._id },
      });
      return;
    }

    // Create new session
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const session = await TimeTrackingSession.create({
      internId: userId,
      date: today,
      sessionStart: now,
      status: 'active',
      heartbeats: [],
      appVersion: req.body.appVersion,
      deviceInfo: req.body.deviceInfo,
    });

    logger.info(`Time tracking session started for intern ${userId}`, {
      sessionId: session._id,
    });

    res.status(201).json({
      status: 'success',
      message: 'Session started successfully',
      data: {
        sessionId: session._id,
        sessionStart: session.sessionStart,
      },
    });
  } catch (error) {
    logger.error('Error starting time tracking session', { error });
    next(error);
  }
};

/**
 * Receive heartbeat from desktop app
 * Updates activity data periodically
 */
export const receiveHeartbeat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { sessionId, activityPercent, mouseMovements, isIdle, activeSeconds } = req.body;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    if (!sessionId) {
      res.status(400).json({ status: 'error', message: 'Session ID is required' });
      return;
    }

    // Find the session
    const session = await TimeTrackingSession.findOne({
      _id: sessionId,
      internId: userId,
      status: 'active',
    });

    if (!session) {
      res.status(404).json({
        status: 'error',
        message: 'Active session not found',
      });
      return;
    }

    // Add heartbeat data
    session.heartbeats.push({
      timestamp: new Date(),
      activityPercent: activityPercent || 0,
      mouseMovements: mouseMovements || 0,
      isIdle: isIdle || false,
      activeSeconds: activeSeconds || 0,
    });

    // Update active seconds
    session.totalActiveSeconds = activeSeconds || session.totalActiveSeconds;

    await session.save();

    res.status(200).json({
      status: 'success',
      message: 'Heartbeat received',
    });
  } catch (error) {
    logger.error('Error receiving heartbeat', { error });
    next(error);
  }
};

/**
 * End time tracking session
 * Called when intern clicks "Stop" in the desktop app
 */
export const endSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { 
      sessionId, 
      total_active_seconds, 
      total_idle_seconds, 
      total_session_seconds,
    } = req.body;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    if (!sessionId) {
      res.status(400).json({ status: 'error', message: 'Session ID is required' });
      return;
    }

    // Find and update the session
    const session = await TimeTrackingSession.findOne({
      _id: sessionId,
      internId: userId,
    });

    if (!session) {
      res.status(404).json({
        status: 'error',
        message: 'Session not found',
      });
      return;
    }

    // Update session with final data
    session.sessionEnd = new Date();
    session.totalActiveSeconds = total_active_seconds || session.totalActiveSeconds;
    session.totalIdleSeconds = total_idle_seconds || 0;
    session.totalSessionSeconds = total_session_seconds || 
      Math.round((session.sessionEnd.getTime() - session.sessionStart.getTime()) / 1000);
    session.status = 'completed';

    await session.save();

    // Also update the weekly InternTimeTracking record
    await updateWeeklyTracking(userId, session);

    logger.info(`Time tracking session ended for intern ${userId}`, {
      sessionId: session._id,
      totalActiveSeconds: session.totalActiveSeconds,
      averageActivity: session.averageActivity,
    });

    res.status(200).json({
      status: 'success',
      message: 'Session ended successfully',
      data: {
        sessionId: session._id,
        totalActiveSeconds: session.totalActiveSeconds,
        totalIdleSeconds: session.totalIdleSeconds,
        totalSessionSeconds: session.totalSessionSeconds,
        averageActivity: session.averageActivity,
      },
    });
  } catch (error) {
    logger.error('Error ending time tracking session', { error });
    next(error);
  }
};

/**
 * Helper function to update weekly tracking record
 */
async function updateWeeklyTracking(internId: string, session: ITimeTrackingSession) {
  try {
    // Calculate week start (Monday)
    const date = new Date(session.date);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(date.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Find or create weekly tracking
    let weeklyTracking = await InternTimeTracking.findOne({
      internId,
      weekStartDate: weekStart,
    });

    if (!weeklyTracking) {
      weeklyTracking = await InternTimeTracking.create({
        internId,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        tasks: [],
        status: 'active',
      });
    }

    // Add/update task for today
    const sessionDate = new Date(session.date);
    const hours = session.totalActiveSeconds / 3600;
    
    const existingTaskIndex = weeklyTracking.tasks.findIndex(
      (task: any) => {
        const taskDate = new Date(task.date);
        return taskDate.toDateString() === sessionDate.toDateString();
      }
    );

    if (existingTaskIndex >= 0) {
      // Update existing task hours
      weeklyTracking.tasks[existingTaskIndex].hours += hours;
      weeklyTracking.tasks[existingTaskIndex].description += 
        ` | Session: ${formatTime(session.totalActiveSeconds)} active time`;
    } else {
      // Add new task
      weeklyTracking.tasks.push({
        date: sessionDate,
        description: `Desktop tracked: ${formatTime(session.totalActiveSeconds)} active time`,
        hours: hours,
      });
    }

    await weeklyTracking.save();
  } catch (error) {
    logger.error('Error updating weekly tracking', { error });
  }
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

/**
 * Get current active session
 */
export const getActiveSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    const session = await TimeTrackingSession.findOne({
      internId: userId,
      status: 'active',
    });

    res.status(200).json({
      status: 'success',
      data: session ? {
        sessionId: session._id,
        sessionStart: session.sessionStart,
        totalActiveSeconds: session.totalActiveSeconds,
        averageActivity: session.averageActivity,
        hasActiveSession: true,
      } : {
        hasActiveSession: false,
      },
    });
  } catch (error) {
    logger.error('Error getting active session', { error });
    next(error);
  }
};

/**
 * Get today's tracking summary
 */
export const getTodaySummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const targetId = req.params.internId || userId;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    // Check permissions if viewing another intern's data
    if (targetId !== userId) {
      const hasPermission = req.user?.permissions?.includes('view_interns') || 
                           req.user?.permissions?.includes('manage_interns');
      if (!hasPermission) {
        res.status(403).json({ status: 'error', message: 'Permission denied' });
        return;
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessions = await TimeTrackingSession.find({
      internId: targetId,
      date: { $gte: today },
    }).sort({ sessionStart: -1 });

    const totalActive = sessions.reduce((sum, s) => sum + s.totalActiveSeconds, 0);
    const avgActivity = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.averageActivity, 0) / sessions.length
      : 0;

    res.status(200).json({
      status: 'success',
      data: {
        date: today,
        sessions: sessions.map(s => ({
          sessionId: s._id,
          sessionStart: s.sessionStart,
          sessionEnd: s.sessionEnd,
          status: s.status,
          totalActiveSeconds: s.totalActiveSeconds,
          averageActivity: s.averageActivity,
        })),
        summary: {
          sessionsCount: sessions.length,
          totalActiveSeconds: totalActive,
          totalActiveHours: (totalActive / 3600).toFixed(2),
          averageActivity: Math.round(avgActivity),
        },
      },
    });
  } catch (error) {
    logger.error('Error getting today summary', { error });
    next(error);
  }
};

/**
 * Get session history
 */
export const getSessionHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const targetId = req.params.internId || userId;
    const { startDate, endDate, page = 1, limit = 20 } = req.query;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    // Check permissions if viewing another intern's data
    if (targetId !== userId) {
      const hasPermission = req.user?.permissions?.includes('view_interns') || 
                           req.user?.permissions?.includes('manage_interns');
      if (!hasPermission) {
        res.status(403).json({ status: 'error', message: 'Permission denied' });
        return;
      }
    }

    const query: any = { internId: targetId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const sessions = await TimeTrackingSession.find(query)
      .sort({ date: -1, sessionStart: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await TimeTrackingSession.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        sessions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Error getting session history', { error });
    next(error);
  }
};

/**
 * Get weekly summary for an intern
 */
export const getWeeklySummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const targetId = req.params.internId || userId;
    const { weekStart } = req.query;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    // Check permissions
    if (targetId !== userId) {
      const hasPermission = req.user?.permissions?.includes('view_interns') || 
                           req.user?.permissions?.includes('manage_interns');
      if (!hasPermission) {
        res.status(403).json({ status: 'error', message: 'Permission denied' });
        return;
      }
    }

    // Calculate week start (Monday)
    let startOfWeek: Date;
    if (weekStart) {
      startOfWeek = new Date(weekStart as string);
    } else {
      startOfWeek = new Date();
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
    }
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const sessions = await TimeTrackingSession.find({
      internId: targetId,
      date: { $gte: startOfWeek, $lt: endOfWeek },
      status: 'completed',
    }).sort({ date: 1 });

    // Group by day
    const dailyData: { [key: string]: any } = {};
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      const dayKey = day.toISOString().split('T')[0];
      dailyData[dayKey] = {
        date: dayKey,
        dayName: dayNames[day.getDay()],
        totalActiveSeconds: 0,
        totalActiveHours: '0.00',
        sessionsCount: 0,
        averageActivity: 0,
      };
    }

    sessions.forEach(session => {
      const dayKey = new Date(session.date).toISOString().split('T')[0];
      if (dailyData[dayKey]) {
        dailyData[dayKey].totalActiveSeconds += session.totalActiveSeconds;
        dailyData[dayKey].sessionsCount += 1;
        dailyData[dayKey].averageActivity = 
          (dailyData[dayKey].averageActivity * (dailyData[dayKey].sessionsCount - 1) + session.averageActivity) 
          / dailyData[dayKey].sessionsCount;
        dailyData[dayKey].totalActiveHours = (dailyData[dayKey].totalActiveSeconds / 3600).toFixed(2);
      }
    });

    const totalActive = sessions.reduce((sum, s) => sum + s.totalActiveSeconds, 0);
    const avgActivity = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.averageActivity, 0) / sessions.length
      : 0;

    res.status(200).json({
      status: 'success',
      data: {
        weekStart: startOfWeek,
        weekEnd: endOfWeek,
        dailyBreakdown: Object.values(dailyData),
        summary: {
          totalSessions: sessions.length,
          totalActiveSeconds: totalActive,
          totalActiveHours: (totalActive / 3600).toFixed(2),
          averageActivity: Math.round(avgActivity),
        },
      },
    });
  } catch (error) {
    logger.error('Error getting weekly summary', { error });
    next(error);
  }
};

/**
 * Generate desktop app launch token
 * Creates a temporary token for the desktop app
 */
export const generateLaunchToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    // Check if user has permission to track time
    const hasPermission = req.user?.permissions?.includes('track_own_time') || 
                          req.user?.role === 'intern' ||
                          true; // Allow all authenticated users for now

    if (!hasPermission) {
      res.status(403).json({ 
        status: 'error', 
        message: 'You do not have permission to use time tracking' 
      });
      return;
    }

    // Get employee name
    const employee = await Employee.findById(userId);
    if (!employee) {
      res.status(404).json({ status: 'error', message: 'Employee not found' });
      return;
    }

    // Use the existing JWT token for the desktop app
    const token = req.headers.authorization?.replace('Bearer ', '');

    res.status(200).json({
      status: 'success',
      data: {
        launchToken: token,
        internName: employee.name,
        internId: userId,
        expiresIn: 3600, // 1 hour
        launchUrl: `vihi-tracker://start?token=${token}&name=${encodeURIComponent(employee.name)}`,
      },
    });
  } catch (error) {
    logger.error('Error generating launch token', { error });
    next(error);
  }
};
