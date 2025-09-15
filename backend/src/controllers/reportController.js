import { getCollection } from '../../config/database.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { asyncHandler } from '../utils/errorHandler.js';

// Generate report for a session
export const generateReport = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  
  try {
    const sessionsCollection = getCollection('interview_sessions');
    const logsCollection = getCollection('detection_logs');
    
    // Get session data
    const session = await sessionsCollection.findOne({ 
      sessionId,
      interviewerId: req.user._id 
    });
    
    if (!session) {
      return sendError(res, 'Session not found', 404);
    }
    
    // Get all events for this session
    const events = await logsCollection.find({ sessionId }).sort({ timestamp: 1 }).toArray();
    
    // Calculate session duration
    const startTime = session.startTime ? new Date(session.startTime) : new Date(session.createdAt);
    const endTime = session.endTime ? new Date(session.endTime) : new Date();
    const duration = Math.round((endTime - startTime) / 60000); // minutes
    
    // Analyze violations
    const violations = {
      totalViolations: events.length,
      focusLost: events.filter(e => e.eventType === 'focus_lost').length,
      noFaceDetected: events.filter(e => e.eventType === 'no_face').length,
      multipleFaces: events.filter(e => e.eventType === 'multiple_faces').length,
      phoneDetected: events.filter(e => e.eventType === 'phone_detected').length,
      notesDetected: events.filter(e => e.eventType === 'notes_detected').length
    };
    
    // Calculate integrity score
    let baseScore = 100;
    let deductions = [];
    
    // Deduction rules
    const rules = {
      focus_lost: { points: 5, description: 'Looking away from screen' },
      no_face: { points: 10, description: 'Face not visible' },
      multiple_faces: { points: 15, description: 'Multiple people detected' },
      phone_detected: { points: 20, description: 'Phone or device detected' },
      notes_detected: { points: 15, description: 'Notes or books detected' }
    };
    
    Object.keys(violations).forEach(violationType => {
      if (violationType !== 'totalViolations') {
        const count = violations[violationType];
        const eventType = violationType.replace(/([A-Z])/g, '_$1').toLowerCase().replace('_detected', '_detected').replace('face_detected', 'face');
        
        let ruleKey = eventType;
        if (violationType === 'focusLost') ruleKey = 'focus_lost';
        if (violationType === 'noFaceDetected') ruleKey = 'no_face';
        if (violationType === 'multipleFaces') ruleKey = 'multiple_faces';
        if (violationType === 'phoneDetected') ruleKey = 'phone_detected';
        if (violationType === 'notesDetected') ruleKey = 'notes_detected';
        
        if (count > 0 && rules[ruleKey]) {
          const deduction = count * rules[ruleKey].points;
          baseScore -= deduction;
          deductions.push({
            type: rules[ruleKey].description,
            count: count,
            pointsEach: rules[ruleKey].points,
            deduction: deduction
          });
        }
      }
    });
    
    // Ensure score doesn't go below 0
    const finalScore = Math.max(0, baseScore);
    
    // Determine risk level
    let riskLevel = 'LOW';
    if (finalScore < 40) riskLevel = 'CRITICAL';
    else if (finalScore < 60) riskLevel = 'HIGH';
    else if (finalScore < 80) riskLevel = 'MEDIUM';
    
    // Time analysis
    const timeAnalysis = {
      totalFocusLostTime: violations.focusLost * 5, // Assuming 5 seconds per focus lost
      totalNoFaceTime: violations.noFaceDetected * 10, // Assuming 10 seconds per no face
      sessionDuration: duration
    };
    
    // Generate report
    const report = {
      sessionId,
      candidateName: session.candidateName,
      candidateEmail: session.candidateEmail,
      interviewerName: session.interviewerName,
      interviewerEmail: session.interviewerEmail,
      sessionDuration: duration,
      startTime: session.startTime || session.createdAt,
      endTime: session.endTime || new Date(),
      integrityScore: {
        score: finalScore,
        baseScore: 100,
        totalDeductions: 100 - finalScore,
        details: {
          violations: deductions
        }
      },
      riskLevel,
      violations,
      timeAnalysis,
      detailedEvents: events.map(event => ({
        timestamp: event.timestamp,
        eventType: event.eventType,
        description: event.description,
        confidence: event.confidence || 0,
        source: event.source || 'system'
      })),
      generatedAt: new Date(),
      reportVersion: '1.0'
    };
    
    // Save report to database
    const reportsCollection = getCollection('reports');
    await reportsCollection.replaceOne(
      { sessionId },
      report,
      { upsert: true }
    );
    
    sendSuccess(res, report, 'Report generated successfully');
    
  } catch (error) {
    console.error('Report generation error:', error);
    sendError(res, 'Failed to generate report', 500);
  }
});

// Get existing report
export const getReport = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  
  const reportsCollection = getCollection('reports');
  const report = await reportsCollection.findOne({ sessionId });
  
  if (!report) {
    return sendError(res, 'Report not found. Please generate report first.', 404);
  }
  
  sendSuccess(res, report, 'Report retrieved successfully');
});