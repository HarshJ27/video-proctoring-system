import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoCapture from '../components/VideoCapture';
import DetectionLog from '../components/DetectionLog';
import { useAuth } from '../context/AuthContext';

const Interview = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [session, setSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [sessionActive, setSessionActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch session details
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`https://video-proctoring-system-0ond.onrender.com/api/sessions/${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();
        
        if (data.success) {
          setSession(data.data);
          setSessionActive(data.data.status === 'active');
        } else {
          setError('Session not found');
        }
      } catch (err) {
        setError('Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  // Handle event logging
  const handleEventLog = (eventData) => {
    const newEvent = {
      ...eventData,
      timestamp: new Date()
    };
    setEvents(prev => [...prev, newEvent]);
  };

  // Handle session status changes
  const handleSessionStatusChange = (active) => {
    setSessionActive(active);
  };

  // Generate report and navigate
  const handleGenerateReport = async () => {
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
        alert('Report generated successfully!');
        navigate(`/report/${sessionId}`);
      } else {
        alert('Failed to generate report: ' + data.message);
      }
    } catch (error) {
      alert('Error generating report. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading interview session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const candidateLink = `${window.location.origin}/candidate/${sessionId}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-bold text-gray-900">
                  Interview Session
                </h1>
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                  DEMO MODE
                </span>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                <span>Candidate: <span className="font-medium">{session?.candidateName}</span></span>
                <span>•</span>
                <span>Interviewer: <span className="font-medium">{user?.name}</span></span>
                <span>•</span>
                <span>Session ID: <span className="font-mono text-xs">{sessionId}</span></span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`h-3 w-3 rounded-full ${sessionActive ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-sm font-medium">
                  {sessionActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900"
              >
                Back to Dashboard
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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Video Capture - Takes 2 columns */}
          <div className="xl:col-span-2">
            <VideoCapture
              sessionId={sessionId}
              onEventLog={handleEventLog}
              onSessionStatusChange={handleSessionStatusChange}
            />
          </div>

          {/* Detection Log - Takes 1 column */}
          <div className="xl:col-span-1">
            <DetectionLog 
              events={events}
              sessionActive={sessionActive}
            />
          </div>
        </div>

        {/* Session Info Card */}
        <div className="mt-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Session Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Candidate Name</label>
                <p className="text-gray-900">{session?.candidateName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Candidate Email</label>
                <p className="text-gray-900">{session?.candidateEmail}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Session Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  session?.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : session?.status === 'completed'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {session?.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p className="text-gray-900">
                  {new Date(session?.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Candidate Link */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Candidate Join Link</label>
              <div className="mt-1 flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={candidateLink}
                  className="input-field text-sm flex-1"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(candidateLink)}
                  className="btn-primary text-sm"
                >
                  Copy
                </button>
              </div>
            </div>

            {session?.interviewerNotes && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <p className="text-gray-900 mt-1">{session.interviewerNotes}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleGenerateReport}
                className="btn-primary"
                disabled={sessionActive}
              >
                Generate Report
              </button>
              
              {session?.status === 'completed' && (
                <button
                  onClick={() => navigate(`/report/${sessionId}`)}
                  className="btn-success"
                >
                  View Report
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Interview;