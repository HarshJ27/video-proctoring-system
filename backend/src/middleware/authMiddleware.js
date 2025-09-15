import jwt from 'jsonwebtoken';
import { config } from '../utils/config.js';
import { getCollection } from '../../config/database.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided'
      });
    }
    
    const decoded = jwt.verify(token, config.jwt.secret);

    // Get user from database
    const usersCollection = getCollection('users');
    const user = await usersCollection.findOne({ email: decoded.user.email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};