import express from 'express';
import authRoutes from './authRoutes.js';
import sessionRoutes from './sessionRoutes.js';
import reportRoutes from './reportRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/sessions', sessionRoutes);
router.use('/reports', reportRoutes);

export default router;