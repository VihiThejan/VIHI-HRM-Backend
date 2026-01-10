import mongoose from 'mongoose';
import { logger } from './logger';

// Global cache for MongoDB connection (serverless optimization)
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export const connectDB = async (): Promise<typeof mongoose> => {
  // Return existing connection if available
  if (cached.conn) {
    return cached.conn;
  }

  // Return existing promise if connection is in progress
  if (!cached.promise) {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vihi_hrm';
    
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(mongoURI, opts).then((mongoose) => {
      logger.info(`✅ MongoDB Connected: ${mongoose.connection.host}`);
      
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
      });
      
      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });
      
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    logger.error('Error connecting to MongoDB:', e);
    throw e;
  }

  return cached.conn;
};
