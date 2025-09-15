import express from 'express';
import { 
  createSession, 
  getSession, 
  getAllSessions,
  updateSession, 
  logEvent,
  getPublicSession,
  startCandidateSession,
  completeCandidateSession
} from '../controllers/sessionController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes for candidates (no authentication required)
router.get('/:sessionId/public', getPublicSession);
router.post('/:sessionId/start', startCandidateSession);
router.post('/:sessionId/complete', completeCandidateSession);
router.post('/:sessionId/events', logEvent); // Allow candidates to log events

// Authenticated routes for interviewers
router.use(authenticate);

router.post('/', createSession);           // Create new interview session
router.get('/', getAllSessions);          // Get all sessions for interviewer
router.get('/:sessionId', getSession);     // Get session details
router.put('/:sessionId', updateSession); // Update session status (legacy)

export default router;