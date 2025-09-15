import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState({
    candidateName: '',
    candidateEmail: '',
    interviewerNotes: ''
  });
  const [sessions, setSessions] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [sessionCreated, setSessionCreated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Fetch sessions
  const fetchSessions = async (status = 'all') => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`https://video-proctoring-system-0ond.onrender.com/api/sessions?status=${status}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setSessions(data.data.sessions);
        setStatusCounts(data.data.statusCounts);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions(selectedStatus);
  }, [selectedStatus]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`https://video-proctoring-system-0ond.onrender.com/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sessionData),
      });

      const data = await response.json();
      
      if (data.success) {
        const sessionId = data.data.sessionId;
        const candidateLink = `${window.location.origin}/candidate/${sessionId}`;
        
        setSessionCreated({
          sessionId,
          candidateLink,
          session: data.data
        });
        
        setSessionData({ candidateName: '', candidateEmail: '', interviewerNotes: '' });
        
        // Refresh sessions list
        fetchSessions(selectedStatus);
      } else {
        alert('Failed to create session: ' + data.message);
      }
    } catch (error) {
      alert('Error creating session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Link copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy link');
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Interview Sessions Dashboard
              </h1>
              <p className="text-gray-600">Welcome back, {user?.name}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="btn-danger"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="card text-center">
            <div className="text-2xl font-bold text-blue-600">{statusCounts.total || 0}</div>
            <div className="text-sm text-gray-600">Total Sessions</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending || 0}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-blue-600">{statusCounts.active || 0}</div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600">{statusCounts.completed || 0}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-red-600">{statusCounts.expired || 0}</div>
            <div className="text-sm text-gray-600">Expired</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Create Session Card */}
          <div className="lg:col-span-1">
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Create New Session
              </h2>
              <form onSubmit={handleCreateSession} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Candidate Name
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Enter candidate name"
                    value={sessionData.candidateName}
                    onChange={(e) => setSessionData({
                      ...sessionData,
                      candidateName: e.target.value
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Candidate Email
                  </label>
                  <input
                    type="email"
                    required
                    className="input-field"
                    placeholder="Enter candidate email"
                    value={sessionData.candidateEmail}
                    onChange={(e) => setSessionData({
                      ...sessionData,
                      candidateEmail: e.target.value
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Interview Notes
                  </label>
                  <textarea
                    className="input-field"
                    rows="3"
                    placeholder="Additional notes about the interview"
                    value={sessionData.interviewerNotes}
                    onChange={(e) => setSessionData({
                      ...sessionData,
                      interviewerNotes: e.target.value
                    })}
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  className="w-full btn-primary disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Creating Session...' : 'Create Session'}
                </button>
              </form>
            </div>
          </div>

          {/* Sessions List */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Interview Sessions
                </h2>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="input-field w-auto"
                >
                  <option value="all">All Sessions</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              {sessionsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading sessions...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">📋</div>
                  <p className="text-gray-600">No sessions found</p>
                  <p className="text-sm text-gray-500">Create your first interview session to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div key={session.sessionId} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-gray-900">{session.candidateName}</h3>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(session.status)}`}>
                              {session.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>📧 {session.candidateEmail}</div>
                            <div>📅 Created: {formatDate(session.createdAt)}</div>
                            {session.startTime && (
                              <div>▶️ Started: {formatDate(session.startTime)}</div>
                            )}
                            {session.endTime && (
                              <div>⏹️ Completed: {formatDate(session.endTime)}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2 ml-4">
                          {session.status === 'completed' && (
                            <button
                              onClick={() => navigate(`/report/${session.sessionId}`)}
                              className="btn-success text-xs"
                            >
                              View Report
                            </button>
                          )}
                          {(session.status === 'pending' || session.status === 'active') && (
                            <button
                              onClick={() => copyToClipboard(`${window.location.origin}/candidate/${session.sessionId}`)}
                              className="btn-primary text-xs"
                            >
                              Copy Link
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Session Created Modal */}
      {sessionCreated && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Session Created Successfully! 🎉</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session ID
                </label>
                <div className="p-2 bg-gray-100 rounded font-mono text-sm">
                  {sessionCreated.sessionId}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Candidate Link (Send this to the candidate)
                </label>
                <div className="p-2 bg-blue-50 rounded text-sm border border-blue-200">
                  <div className="text-blue-600 break-all">
                    {sessionCreated.candidateLink}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(sessionCreated.candidateLink)}
                  className="mt-2 text-xs btn-primary"
                >
                  📋 Copy Link
                </button>
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <span className="text-green-600">✅</span>
                  <div className="text-sm text-green-800">
                    <p className="font-medium">Next Steps:</p>
                    <ol className="mt-1 space-y-1 list-decimal list-inside text-xs">
                      <li>Send the candidate link to the interviewee</li>
                      <li>Candidate will take the monitored session</li>
                      <li>View the report here once session is completed</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSessionCreated(null)}
                className="btn-primary"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;