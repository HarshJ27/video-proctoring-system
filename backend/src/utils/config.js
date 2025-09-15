import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT) || 5005,
    nodeEnv: process.env.NODE_ENV || 'development',
    uploadPath: process.env.UPLOAD_PATH || join(__dirname, '../../uploads')
  },

  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/video_proctoring',
    dbName: process.env.DB_NAME || 'video_proctoring',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 30000,
      bufferMaxEntries: 0
    }
  },

  // JWT Configuration  
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-development-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // CORS Configuration
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  },

  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024, // 100MB
    allowedTypes: ['video/mp4', 'video/webm', 'video/ogg']
  },

  // Rate Limiting
  rateLimit: {
    windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  // Collections (since we're using raw MongoDB)
  collections: {
    users: 'users',
    sessions: 'interview_sessions', 
    logs: 'detection_logs',
    reports: 'proctoring_reports'
  }
};

export default config;