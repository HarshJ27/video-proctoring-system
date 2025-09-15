import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Report = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [sessionId]);

  const fetchReport = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`https://video-proctoring-system-0ond.onrender.com/api/reports/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setReport(data.data);
      } else {
        if (response.status === 404) {
          setError('Report not found. Click "Generate Report" to create one.');
        } else {
          setError('Failed to load report');
        }
      }
    } catch (err) {
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  };
  

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`https://video-proctoring-system-0ond.onrender.com/api/reports/${sessionId}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setReport(data.data);
        setError('');
      } else {
        setError('Failed to generate report: ' + data.message);
      }
    } catch (error) {
      setError('Error generating report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    
    try {
      // Create comprehensive report content
      const content = `
VIDEO PROCTORING REPORT
=====================

Session Information:
- Session ID: ${report.sessionId}
- Candidate: ${report.candidateName}
- Email: ${report.candidateEmail}
- Interviewer: ${report.interviewerName}
- Duration: ${report.sessionDuration} minutes
- Start Time: ${new Date(report.startTime).toLocaleString()}
- End Time: ${new Date(report.endTime).toLocaleString()}

INTEGRITY SCORE: ${report.integrityScore.score}/100
Risk Level: ${report.riskLevel}

VIOLATION SUMMARY:
- Total Violations: ${report.violations.totalViolations}
- Focus Lost: ${report.violations.focusLost}
- No Face Detected: ${report.violations.noFaceDetected}
- Multiple Faces: ${report.violations.multipleFaces}
- Phone Detected: ${report.violations.phoneDetected}
- Notes Detected: ${report.violations.notesDetected}

SCORE BREAKDOWN:
- Base Score: ${report.integrityScore.baseScore}
- Total Deductions: -${report.integrityScore.totalDeductions}
${report.integrityScore.details.violations.map(v => 
  `- ${v.type}: ${v.count}x @ -${v.pointsEach} pts = -${v.deduction} pts`
).join('\n')}

TIME ANALYSIS:
- Total Focus Lost Time: ${report.timeAnalysis.totalFocusLostTime} seconds
- Total No Face Time: ${report.timeAnalysis.totalNoFaceTime} seconds
- Session Duration: ${report.timeAnalysis.sessionDuration} minutes

DETAILED EVENTS:
${report.detailedEvents.length === 0 ? 'No violations detected.' : 
  report.detailedEvents.map(event => 
    `- ${new Date(event.timestamp).toLocaleTimeString()}: ${event.eventType.toUpperCase()}\n  ${event.description} (Confidence: ${(event.confidence * 100).toFixed(0)}%)`
  ).join('\n')
}

RECOMMENDATIONS:
${report.riskLevel === 'LOW' ? '✅ Low risk candidate - proceed with confidence' : 
  report.riskLevel === 'MEDIUM' ? '⚠️ Medium risk - review session recording recommended' : 
  '🚨 High risk - manual review required'}

Generated: ${new Date(report.generatedAt).toLocaleString()}
Report Version: ${report.reportVersion}
`;

      // Create and download file
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `proctoring_report_${report.candidateName.replace(/\s+/g, '_')}_${sessionId.substring(0, 8)}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('Report downloaded successfully');
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'LOW': return 'text-green-600 bg-green-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Proctoring Report
              </h1>
              <p className="text-gray-600">
                {report ? `Generated on ${new Date(report.generatedAt).toLocaleDateString()}` : 'Report Generation'}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {report && (
                <button
                  onClick={downloadReport}
                  className="btn-success"
                >
                  📥 Download Report
                </button>
              )}
              
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </button>
              
              <button 
                onClick={logout}
                className="btn-danger"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {error && !report ? (
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Not Available</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={handleGenerateReport}
              disabled={generating}
              className="btn-primary disabled:opacity-50"
            >
              {generating ? 'Generating Report...' : 'Generate Report'}
            </button>
          </div>
        ) : report ? (
          <div className="space-y-6">
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Integrity Score */}
              <div className="card text-center">
                <div className="text-3xl font-bold mb-2">
                  <span className={getScoreColor(report.integrityScore.score)}>
                    {report.integrityScore.score}%
                  </span>
                </div>
                <div className="text-gray-600">Integrity Score</div>
                <div className="mt-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(report.riskLevel)}`}>
                    {report.riskLevel} Risk
                  </span>
                </div>
              </div>

              {/* Session Duration */}
              <div className="card text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {report.sessionDuration}
                </div>
                <div className="text-gray-600">Minutes</div>
                <div className="text-sm text-gray-500 mt-1">Session Duration</div>
              </div>

              {/* Total Violations */}
              <div className="card text-center">
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {report.violations.totalViolations}
                </div>
                <div className="text-gray-600">Total Violations</div>
                <div className="text-sm text-gray-500 mt-1">All Events</div>
              </div>

              {/* Focus Lost Time */}
              <div className="card text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {report.timeAnalysis.totalFocusLostTime}s
                </div>
                <div className="text-gray-600">Focus Lost</div>
                <div className="text-sm text-gray-500 mt-1">Total Time</div>
              </div>
            </div>

            {/* Candidate Information */}
            <div className="card">
              <h3 className="text-xl font-semibold mb-4">Interview Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Candidate Name</label>
                  <p className="text-gray-900 font-medium">{report.candidateName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{report.candidateEmail}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Interviewer</label>
                  <p className="text-gray-900">{report.interviewerName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Time</label>
                  <p className="text-gray-900">{new Date(report.startTime).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Time</label>
                  <p className="text-gray-900">{new Date(report.endTime).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Session ID</label>
                  <p className="text-gray-900 font-mono text-sm">{sessionId}</p>
                </div>
              </div>
            </div>

            {/* Violation Breakdown */}
            <div className="card">
              <h3 className="text-xl font-semibold mb-4">Violation Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                
                {/* Focus Lost */}
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-2xl mb-2">👀</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {report.violations.focusLost}
                  </div>
                  <div className="text-sm text-gray-600">Focus Lost</div>
                </div>

                {/* No Face */}
                <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-2xl mb-2">😶</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {report.violations.noFaceDetected}
                  </div>
                  <div className="text-sm text-gray-600">No Face</div>
                </div>

                {/* Multiple Faces */}
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-2xl mb-2">👥</div>
                  <div className="text-2xl font-bold text-red-600">
                    {report.violations.multipleFaces}
                  </div>
                  <div className="text-sm text-gray-600">Multiple Faces</div>
                </div>

                {/* Phone Detected */}
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-2xl mb-2">📱</div>
                  <div className="text-2xl font-bold text-red-600">
                    {report.violations.phoneDetected}
                  </div>
                  <div className="text-sm text-gray-600">Phone</div>
                </div>

                {/* Notes Detected */}
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-2xl mb-2">📝</div>
                  <div className="text-2xl font-bold text-red-600">
                    {report.violations.notesDetected}
                  </div>
                  <div className="text-sm text-gray-600">Notes</div>
                </div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="card">
              <h3 className="text-xl font-semibold mb-4">Score Breakdown</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Base Score</span>
                  <span className="font-semibold text-green-600">100</span>
                </div>
                
                {report.integrityScore.details.violations.map((violation, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-700">{violation.type}</span>
                      <span className="text-sm text-gray-500">({violation.count}x @ -{violation.pointsEach} pts)</span>
                    </div>
                    <span className="text-red-600">-{violation.deduction}</span>
                  </div>
                ))}
                
                <div className="border-t pt-4 flex justify-between items-center text-lg font-semibold">
                  <span>Final Score</span>
                  <span className={getScoreColor(report.integrityScore.score)}>
                    {report.integrityScore.score}%
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline of Events */}
            <div className="card">
              <h3 className="text-xl font-semibold mb-4">Event Timeline</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {report.detailedEvents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🎉</div>
                    <p>No violations detected during the session</p>
                  </div>
                ) : (
                  report.detailedEvents.map((event, index) => (
                    <div key={index} className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border">
                          {event.eventType === 'focus_lost' && '👀'}
                          {event.eventType === 'no_face' && '😶'}
                          {event.eventType === 'multiple_faces' && '👥'}
                          {event.eventType === 'phone_detected' && '📱'}
                          {event.eventType === 'notes_detected' && '📝'}
                        </div>
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {event.eventType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </p>
                            <p className="text-sm text-gray-600">{event.description}</p>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <p>{new Date(event.timestamp).toLocaleTimeString()}</p>
                            {event.confidence > 0 && (
                              <p>Confidence: {(event.confidence * 100).toFixed(0)}%</p>
                            )}
                            <p className="text-xs">({event.source})</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recommendations */}
            <div className="card">
              <h3 className="text-xl font-semibold mb-4">Recommendations</h3>
              <div className="space-y-3">
                {report.riskLevel === 'LOW' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600">✅</span>
                      <span className="font-medium text-green-800">Low Risk - Proceed with confidence</span>
                    </div>
                    <p className="text-green-700 text-sm mt-1">
                      The candidate showed minimal suspicious activity during the interview.
                    </p>
                  </div>
                )}
                
                {report.riskLevel === 'MEDIUM' && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span className="text-yellow-600">⚠️</span>
                      <span className="font-medium text-yellow-800">Medium Risk - Review recommended</span>
                    </div>
                    <p className="text-yellow-700 text-sm mt-1">
                      Some violations detected. Consider reviewing the session recording.
                    </p>
                  </div>
                )}
                
                {(report.riskLevel === 'HIGH' || report.riskLevel === 'CRITICAL') && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span className="text-red-600">🚨</span>
                      <span className="font-medium text-red-800">High Risk - Manual review required</span>
                    </div>
                    <p className="text-red-700 text-sm mt-1">
                      Multiple violations detected. Manual review of interview is strongly recommended.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="card text-center text-sm text-gray-500">
              <p>
                Report generated by Video Proctoring System v{report.reportVersion} 
                on {new Date(report.generatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading report...</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Report;