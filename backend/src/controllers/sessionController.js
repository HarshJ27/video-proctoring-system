import { v4 as uuidv4 } from 'uuid';
import { getCollection } from '../../config/database.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { asyncHandler } from '../utils/errorHandler.js';

// Create new interview session
export const createSession = asyncHandler(async (req, res) => {
  const { candidateName, candidateEmail, interviewerNotes } = req.body;
  
  if (!candidateName || !candidateEmail) {
    return sendError(res, 'Candidate name and email are required', 400);
  }
  
  const sessionsCollection = getCollection('interview_sessions');
  
  const newSession = {
    sessionId: uuidv4(),
    candidateName,
    candidateEmail,
    interviewerId: req.user._id,
    interviewerName: req.user.name,
    interviewerEmail: req.user.email,
    interviewerNotes: interviewerNotes || '',
    status: 'pending', // pending, active, completed, expired
    createdAt: new Date(),
    startTime: null,
    endTime: null,
    candidateJoined: false,
    candidateInfo: {
      name: candidateName,
      email: candidateEmail,
      joinedAt: null,
      completedAt: null,
      ipAddress: null,
      userAgent: null
    },
    sessionSettings: {
      maxDuration: 60, // minutes
      allowRetake: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
  };
  
  const result = await sessionsCollection.insertOne(newSession);
  
  sendSuccess(res, {
    sessionId: newSession.sessionId,
    candidateLink: `/candidate/${newSession.sessionId}`,
    ...newSession
  }, 'Interview session created successfully', 201);
});

// Get all sessions for interviewer
export const getAllSessions = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;
  
  const sessionsCollection = getCollection('interview_sessions');
  
  // Build query
  const query = { interviewerId: req.user._id };
  if (status && status !== 'all') {
    query.status = status;
  }
  
  // Get sessions with pagination
  const sessions = await sessionsCollection
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .toArray();
  
  // Get counts for each status
  const statusCounts = await sessionsCollection.aggregate([
    { $match: { interviewerId: req.user._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]).toArray();
  
  const counts = {
    total: 0,
    pending: 0,
    active: 0,
    completed: 0,
    expired: 0
  };
  
  statusCounts.forEach(item => {
    counts[item._id] = item.count;
    counts.total += item.count;
  });
  
  sendSuccess(res, {
    sessions,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(counts.total / limit),
      totalCount: counts.total
    },
    statusCounts: counts
  }, 'Sessions retrieved successfully');
});

// Get session details (authenticated)
export const getSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  
  const sessionsCollection = getCollection('interview_sessions');
  const session = await sessionsCollection.findOne({ 
    sessionId,
    interviewerId: req.user._id 
  });
  
  if (!session) {
    return sendError(res, 'Session not found', 404);
  }
  
  // Get event counts
  const logsCollection = getCollection('detection_logs');
  const eventCounts = await logsCollection.aggregate([
    { $match: { sessionId } },
    { $group: { _id: '$eventType', count: { $sum: 1 } } }
  ]).toArray();
  
  sendSuccess(res, {
    ...session,
    eventCounts
  }, 'Session retrieved successfully');
});

// Get public session details (no authentication) - for candidates
export const getPublicSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  
  const sessionsCollection = getCollection('interview_sessions');
  const session = await sessionsCollection.findOne(
    { sessionId },
    { 
      projection: { 
        sessionId: 1, 
        candidateName: 1, 
        candidateEmail: 1,
        status: 1, 
        createdAt: 1,
        interviewerName: 1,
        sessionSettings: 1,
        candidateInfo: 1,
        startTime: 1,
        endTime: 1
      } 
    }
  );
  
  if (!session) {
    return sendError(res, 'Session not found', 404);
  }
  
  // Check if session is expired
  if (session.sessionSettings?.expiresAt && new Date() > new Date(session.sessionSettings.expiresAt)) {
    await sessionsCollection.updateOne(
      { sessionId },
      { $set: { status: 'expired' } }
    );
    session.status = 'expired';
  }
  
  sendSuccess(res, session, 'Session retrieved successfully');
});

// Start candidate session
export const startCandidateSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { candidateInfo } = req.body;
  
  const sessionsCollection = getCollection('interview_sessions');
  const session = await sessionsCollection.findOne({ sessionId });
  
  if (!session) {
    return sendError(res, 'Session not found', 404);
  }
  
  // Check if session can be started
  if (session.status === 'completed') {
    return sendError(res, 'Session already completed. Cannot retake.', 400);
  }
  
  if (session.status === 'expired') {
    return sendError(res, 'Session has expired', 400);
  }
  
  if (session.status === 'active') {
    return sendError(res, 'Session is already active', 400);
  }
  
  // Start session
  const updateData = {
    status: 'active',
    startTime: new Date(),
    candidateJoined: true,
    candidateInfo: {
      ...session.candidateInfo,
      ...candidateInfo,
      joinedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    updatedAt: new Date()
  };
  
  await sessionsCollection.updateOne(
    { sessionId },
    { $set: updateData }
  );
  
  sendSuccess(res, { sessionId, status: 'active' }, 'Session started successfully');
});

// Complete candidate session  
export const completeCandidateSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  
  const sessionsCollection = getCollection('interview_sessions');
  const session = await sessionsCollection.findOne({ sessionId });
  
  if (!session) {
    return sendError(res, 'Session not found', 404);
  }
  
  if (session.status !== 'active') {
    return sendError(res, 'Session is not active', 400);
  }
  
  // Complete session
  const updateData = {
    status: 'completed',
    endTime: new Date(),
    'candidateInfo.completedAt': new Date(),
    updatedAt: new Date()
  };
  
  await sessionsCollection.updateOne(
    { sessionId },
    { $set: updateData }
  );
  
  sendSuccess(res, { sessionId, status: 'completed' }, 'Session completed successfully');
});

// Update session status (for backward compatibility)
export const updateSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { status, candidateInfo } = req.body;
  
  const sessionsCollection = getCollection('interview_sessions');
  
  const updateData = { updatedAt: new Date() };
  if (status) updateData.status = status;
  if (candidateInfo) {
    updateData.candidateInfo = candidateInfo;
    updateData.candidateJoined = true;
  }
  
  const result = await sessionsCollection.updateOne(
    { sessionId },
    { $set: updateData }
  );
  
  if (result.matchedCount === 0) {
    return sendError(res, 'Session not found', 404);
  }
  
  sendSuccess(res, null, 'Session updated successfully');
});

// Log detection event
export const logEvent = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { eventType, description, confidence, source = 'system' } = req.body;
  
  if (!eventType) {
    return sendError(res, 'Event type is required', 400);
  }
  
  // Verify session exists and is active
  const sessionsCollection = getCollection('interview_sessions');
  const session = await sessionsCollection.findOne({ sessionId });
  
  if (!session) {
    return sendError(res, 'Session not found', 404);
  }
  
  if (session.status !== 'active') {
    return sendError(res, 'Can only log events for active sessions', 400);
  }
  
  const logsCollection = getCollection('detection_logs');
  
  const logEntry = {
    sessionId,
    eventType, // 'focus_lost', 'no_face', 'multiple_faces', 'phone_detected', 'notes_detected'
    description: description || '',
    confidence: confidence || 0,
    source, // 'system' or 'simulation'
    timestamp: new Date()
  };
  
  await logsCollection.insertOne(logEntry);
  
  sendSuccess(res, logEntry, 'Event logged successfully', 201);
});