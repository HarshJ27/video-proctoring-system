import { getCollection } from '../../config/database.js';

// Get session statistics
export const getSessionStatistics = async (sessionId) => {
  const logsCollection = getCollection('detection_logs');
  
  // Aggregation pipeline for session stats
  const pipeline = [
    { $match: { sessionId } },
    {
      $facet: {
        eventCounts: [
          {
            $group: {
              _id: '$eventType',
              count: { $sum: 1 },
              avgConfidence: { $avg: '$confidence' }
            }
          }
        ],
        timelineData: [
          {
            $group: {
              _id: {
                hour: { $hour: '$timestamp' },
                eventType: '$eventType'
              },
              count: { $sum: 1 }
            }
          }
        ],
        totalEvents: [
          { $count: 'total' }
        ]
      }
    }
  ];
  
  const result = await logsCollection.aggregate(pipeline).toArray();
  return result;
};

// Get real-time session status
export const getSessionStatus = async (sessionId) => {
  const logsCollection = getCollection('detection_logs');
  const sessionsCollection = getCollection('interview_sessions');
  
  // Get session info
  const session = await sessionsCollection.findOne({ sessionId });
  
  // Get recent events (last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recentEvents = await logsCollection
    .find({
      sessionId,
      timestamp: { $gte: fiveMinutesAgo }
    })
    .sort({ timestamp: -1 })
    .limit(10)
    .toArray();
  
  return {
    session,
    recentEvents,
    isActive: session.status === 'active',
    lastActivity: recentEvents?.timestamp || null
  };
};