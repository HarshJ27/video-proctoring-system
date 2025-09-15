import express from 'express';
import { generateReport, getReport } from '../controllers/reportController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/:sessionId/generate', generateReport);
router.get('/:sessionId', getReport);

export default router;