/**
 * VIHI IT Solutions - HR Time Tracking System
 * Main Express Server Entry Point
 * @author Vihi IT Solutions
 * @version 1.0.0
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');

// Import routes
const userRoutes = require('./routes/userRoutes');
const activityRoutes = require('./routes/activityRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const reportRoutes = require('./routes/reportRoutes');
const aiRoutes = require('./routes/aiRoutes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
});
const PORT = process.env.PORT || 5000;

// ============================================
// DATABASE CONNECTION
// ============================================
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    process.exit(1);
  }
};

connectDB();

// ============================================
// MIDDLEWARE
// ============================================
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev')); // HTTP request logger

// ============================================
// HEALTH CHECK ROUTE
// ============================================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'VIHI IT Solutions HR System API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ============================================
// API ROUTES
// ============================================
app.use('/api/users', userRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/activity', activityLogRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);

// ============================================
// ERROR HANDLING
// ============================================
app.use(notFound); // 404 handler
app.use(errorHandler); // Global error handler

// ============================================
// SOCKET.IO - LIVE TRACKING
// ============================================
const onlineUsers = new Map(); // Track online employees

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Employee goes online
  socket.on('employee_online', (employeeId) => {
    onlineUsers.set(employeeId, {
      socketId: socket.id,
      employeeId,
      connectedAt: new Date(),
    });
    console.log(`✅ Employee ${employeeId} is online`);
    
    // Broadcast to all admin clients
    io.emit('employee_status_change', {
      employeeId,
      status: 'online',
      timestamp: new Date(),
    });
  });

  // New activity log received
  socket.on('activity_logged', (data) => {
    console.log(`📊 Activity logged for ${data.employeeId}`);
    
    // Broadcast to admin dashboards
    io.emit('activity_update', {
      employeeId: data.employeeId,
      timestamp: data.timestamp,
      activeWindow: data.activeWindow,
      idle: data.idle,
    });
  });

  // Employee disconnects
  socket.on('disconnect', () => {
    // Find and remove from online users
    for (const [employeeId, userData] of onlineUsers.entries()) {
      if (userData.socketId === socket.id) {
        onlineUsers.delete(employeeId);
        console.log(`❌ Employee ${employeeId} went offline`);
        
        io.emit('employee_status_change', {
          employeeId,
          status: 'offline',
          timestamp: new Date(),
        });
        break;
      }
    }
  });
});

// Expose io to routes via app.locals
app.locals.io = io;
app.locals.onlineUsers = onlineUsers;

// ============================================
// START CRON JOB FOR DAILY AI ANALYSIS
// ============================================
const cronJobManager = require('./services/cronJobManager');
cronJobManager.scheduleDailyAnalysis();
console.log('⏰ Daily AI analysis cron job initialized');

// ============================================
// START SERVER
// ============================================
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚡ Socket.io enabled for live tracking`);
});

module.exports = app;
