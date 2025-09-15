import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import { config } from './src/utils/config.js';

// Import routes
import authRoutes from './src/routes/authRoutes.js';
import sessionRoutes from './src/routes/sessionRoutes.js';
import reportRoutes from './src/routes/reportRoutes.js';

dotenv.config();

const app = express();

// CORS setup (inline)
app.use(cors({
    origin: "https://video-proctoring-system-sooty.vercel.app",
    credentials: true
  }));

// Connect to database
await connectDB();

// Basic middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/reports', reportRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Video Proctoring API is running',
    timestamp: new Date()
  });
});

// Handle 404
// app.use('*', (req, res) => {
//   res.status(404).json({
//     success: false,
//     message: `Route ${req.method} ${req.originalUrl} not found`
//   });
// });

// Basic error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});