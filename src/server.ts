import express, { Application, Request, Response, NextFunction } from 'express';
import path from 'path';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';

// Import configurations
import { connectDB } from './config/database';
import { logger } from './config/logger';

// Import WebSocket server
import TimeTrackingWebSocketServer from './websocket/timeTracking.ws';

// Import routes
import authRoutes from './routes/auth.routes';
import employeeRoutes from './routes/employee.routes';
import recruitmentRoutes from './routes/recruitment.routes';
import leaveRoutes from './routes/leave.routes';
import attendanceRoutes from './routes/attendance.routes';
import payrollRoutes from './routes/payroll.routes';
import performanceRoutes from './routes/performance.routes';
import internRoutes from './routes/intern.routes';
import diaryRoutes from './routes/diary.routes';
import timeTrackingRoutes from './routes/timeTracking.routes';
import permissionRoutes from './routes/permission.routes';
import roleRoutes from './routes/role.routes';
import userRoutes from './routes/user.routes';
import googleDriveRoutes from './routes/googleDrive.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { rateLimiter } from './middleware/rateLimiter.middleware';

// Import cron jobs
import './jobs/diaryGeneration.job';

// Import seeding
import { seedPermissionsAndRoles } from './scripts/seedRBAC';

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
  logger.error('❌ JWT_SECRET is not set or using default value. Please set a secure JWT_SECRET in .env file.');
  process.exit(1);
}

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - Required for Vercel and rate limiting to work correctly
app.set('trust proxy', 1);


// Create HTTP server
const httpServer = createServer(app);

// Initialize WebSocket server (will be created after MongoDB connects)
let wsServer: TimeTrackingWebSocketServer | null = null;

// Connect to MongoDB and seed RBAC after connection
(async () => {
  try {
    await connectDB();
    // Seed RBAC after DB connection is established
    await seedPermissionsAndRoles();
    
    // Initialize WebSocket server after MongoDB is ready
    if (!wsServer) {
      wsServer = new TimeTrackingWebSocketServer(httpServer);
      logger.info(`🔌 WebSocket server initialized and available at ws://localhost:${PORT}/ws/time-tracking`);
    }
  } catch (err) {
    logger.error('Failed to connect to DB or seed RBAC:', err);
    // Don't exit, continue running the server
  }
})();


// Middleware
// CORS configuration - support multiple origins
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'https://vihi-hrm-core.pages.dev'];

// Apply CORS before other middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // In development, allow localhost and local network IPs
    if (process.env.NODE_ENV === 'development') {
      // Allow localhost with any port
      if (origin.match(/^http:\/\/localhost:\d+$/)) {
        return callback(null, true);
      }
      // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      if (origin.match(/^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):\d+$/)) {
        return callback(null, true);
      }
    }

    logger.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Security headers (after CORS)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rate limiting (after CORS)
app.use('/api', rateLimiter);

// Handle preflight requests AFTER rate limiting
app.options('*', cors());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/interns', internRoutes);
app.use('/api/diary', diaryRoutes);

app.use('/api/google-drive', googleDriveRoutes);

app.use('/api/time-tracking', timeTrackingRoutes);


// Admin routes
app.use('/api/admin/permissions', permissionRoutes);
app.use('/api/admin/roles', roleRoutes);
app.use('/api/admin/users', userRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server - bind to 0.0.0.0 to accept connections from all network interfaces
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  logger.info(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Rejection:', err);
  // Don't exit the process, just log the error
});

export default app;




