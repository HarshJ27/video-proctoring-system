import { getCollection } from '../../config/database.js';
import { calculateIntegrityScore } from '../utils/scoreCalculator.js';

// Generate comprehensive proctoring report
export const generateProctoringReport = async (sessionId) => {
  try {
    // Get session details
    const session = await getSessionDetails(sessionId);
    
    // Get all detection events
    const events = await getDetectionEvents(sessionId);
    
    // Calculate analytics
    const analytics = await calculateSessionAnalytics(sessionId, events);
    
    // Calculate integrity score
    const integrityScore = calculateIntegrityScore(events, analytics);
    
    // Create report
    const report = {
      sessionId,
      candidateName: session.candidateName,
      candidateEmail: session.candidateEmail,
      interviewerName: session.interviewerName,
      sessionDuration: analytics.sessionDuration,
      startTime: session.startTime,
      endTime: session.endTime,
      
      // Violation Summary
      violations: {
        focusLost: analytics.focusLostCount,
        noFaceDetected: analytics.noFaceCount,
        multipleFaces: analytics.multipleFacesCount,
        phoneDetected: analytics.phoneDetectedCount,
        notesDetected: analytics.notesDetectedCount,
        totalViolations: analytics.totalViolations
      },
      
      // Time-based Analysis
      timeAnalysis: {
        totalFocusLostTime: analytics.totalFocusLostTime,
        longestFocusLostDuration: analytics.longestFocusLostDuration,
        averageViolationGap: analytics.averageViolationGap
      },
      
      // Integrity Score
      integrityScore,
      riskLevel: getRiskLevel(integrityScore),
      
      // Detailed Events
      detailedEvents: events,
      
      // Generated timestamp
      generatedAt: new Date(),
      reportVersion: '1.0'
    };
    
    // Save report to database
    const reportsCollection = getCollection('proctoring_reports');
    await reportsCollection.insertOne(report);
    
    return report;
  } catch (error) {
    throw new Error(`Failed to generate report: ${error.message}`);
  }
};

// Get session details
const getSessionDetails = async (sessionId) => {
  const sessionsCollection = getCollection('interview_sessions');
  return await sessionsCollection.findOne({ sessionId });
};

// Get all detection events for a session
const getDetectionEvents = async (sessionId) => {
  const logsCollection = getCollection('detection_logs');
  return await logsCollection
    .find({ sessionId })
    .sort({ timestamp: 1 })
    .toArray();
};

// Calculate session analytics using MongoDB aggregation
const calculateSessionAnalytics = async (sessionId, events) => {
  const logsCollection = getCollection('detection_logs');
  
  // Use aggregation pipeline for analytics
  const pipeline = [
    { $match: { sessionId } },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$confidence' },
        timestamps: { $push: '$timestamp' }
      }
    }
  ];
  
  const aggregationResult = await logsCollection.aggregate(pipeline).toArray();
  
  // Process results
  const analytics = {
    focusLostCount: 0,
    noFaceCount: 0,
    multipleFacesCount: 0,
    phoneDetectedCount: 0,
    notesDetectedCount: 0,
    totalViolations: events.length,
    sessionDuration: calculateSessionDuration(events),
    totalFocusLostTime: 0,
    longestFocusLostDuration: 0,
    averageViolationGap: 0
  };
  
  // Map aggregation results
  aggregationResult.forEach(item => {
    switch (item._id) {
      case 'focus_lost':
        analytics.focusLostCount = item.count;
        break;
      case 'no_face':
        analytics.noFaceCount = item.count;
        break;
      case 'multiple_faces':
        analytics.multipleFacesCount = item.count;
        break;
      case 'phone_detected':
        analytics.phoneDetectedCount = item.count;
        break;
      case 'notes_detected':
        analytics.notesDetectedCount = item.count;
        break;
    }
  });
  
  // Calculate time-based metrics
  analytics.totalFocusLostTime = calculateFocusLostTime(events);
  analytics.longestFocusLostDuration = calculateLongestViolation(events);
  analytics.averageViolationGap = calculateAverageGap(events);
  
  return analytics;
};

// Helper function to calculate session duration
const calculateSessionDuration = (events) => {
  if (events.length === 0) return 0;
  
  const firstEvent = new Date(events.timestamp);
  const lastEvent = new Date(events[events.length - 1].timestamp);
  
  return Math.round((lastEvent - firstEvent) / 1000 / 60); // in minutes
};

// Calculate total focus lost time
const calculateFocusLostTime = (events) => {
  const focusEvents = events.filter(event => event.eventType === 'focus_lost');
  return focusEvents.length * 5; // Assuming each focus loss is ~5 seconds
};

// Calculate longest violation duration
const calculateLongestViolation = (events) => {
  // Simple implementation - can be enhanced
  return events.length > 0 ? 15 : 0; // seconds
};

// Calculate average gap between violations
const calculateAverageGap = (events) => {
  if (events.length < 2) return 0;
  
  let totalGap = 0;
  for (let i = 1; i < events.length; i++) {
    const gap = new Date(events[i].timestamp) - new Date(events[i-1].timestamp);
    totalGap += gap;
  }
  
  return Math.round(totalGap / (events.length - 1) / 1000 / 60); // in minutes
};

// Get all reports with pagination
export const getAllReports = async (options) => {
  const { page, limit, status, userId } = options;
  const skip = (page - 1) * limit;
  
  const reportsCollection = getCollection('proctoring_reports');
  
  // Build query
  const query = {};
  if (status) query.riskLevel = status;
  
  // Get reports with pagination
  const reports = await reportsCollection
    .find(query)
    .sort({ generatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
  
  // Get total count
  const totalCount = await reportsCollection.countDocuments(query);
  
  return {
    reports,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      hasNext: page * limit < totalCount,
      hasPrev: page > 1
    }
  };
};

// Get risk level based on integrity score
const getRiskLevel = (score) => {
  if (score >= 80) return 'LOW';
  if (score >= 60) return 'MEDIUM';
  if (score >= 40) return 'HIGH';
  return 'CRITICAL';
};