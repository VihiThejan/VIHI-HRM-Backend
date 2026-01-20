import mongoose from 'mongoose';
import { logger } from './logger';

// Global cache for MongoDB connection (serverless optimization)

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;

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


    cached.promise = mongoose.connect(mongoURI, opts).then((mongooseInstance) => {
      logger.info(`✅ MongoDB Connected: ${mongooseInstance.connection.host}`);
      
      mongooseInstance.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
      });
      
      mongooseInstance.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });
      
      return mongooseInstance;

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
