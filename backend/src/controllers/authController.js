import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getCollection } from '../../config/database.js';
import { config } from '../utils/config.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { asyncHandler } from '../utils/errorHandler.js';

// Register new user
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'interviewer' } = req.body;
  
  if (!name || !email || !password) {
    return sendError(res, 'Name, email and password are required', 400);
  }
  
  const usersCollection = getCollection('users');
  
  // Check if user exists
  const existingUser = await usersCollection.findOne({ email });
  if (existingUser) {
    return sendError(res, 'User already exists', 400);
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Create user
  const newUser = {
    name,
    email,
    password: hashedPassword,
    role,
    createdAt: new Date()
  };
  
  const result = await usersCollection.insertOne(newUser);
  
  // Generate JWT
  const token = jwt.sign(
    { userId: result.insertedId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
  
  sendSuccess(res, {
    user: { id: result.insertedId, name, email, role },
    token
  }, 'User registered successfully', 201);
});

// Login user
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return sendError(res, 'Email and password are required', 400);
  }
  
  const usersCollection = getCollection('users');
  
  // Find user
  const user = await usersCollection.findOne({ email });
  if (!user) {
    return sendError(res, 'Invalid credentials', 401);
  }
  
  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return sendError(res, 'Invalid credentials', 401);
  }
  
  // Generate JWT
  const token = jwt.sign(
    { user: user },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
  
  sendSuccess(res, {
    user: { 
      id: user._id, 
      name: user.name, 
      email: user.email, 
      role: user.role 
    },
    token
  }, 'Login successful');
});

// Get user profile
export const getProfile = asyncHandler(async (req, res) => {
  const { _id, name, email, role } = req.user;
  
  sendSuccess(res, {
    id: _id,
    name,
    email,
    role
  }, 'Profile retrieved successfully');
});