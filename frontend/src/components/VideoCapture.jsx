import React, { useState, useEffect, useRef } from 'react';
import { useVideoStream } from '../hooks/useVideoStream';
import { useFaceDetection } from '../hooks/useFaceDetection';
import ViolationSimulator from './ViolationSimulator';

const VideoCapture = ({ sessionId, onEventLog }) => {
  const { 
    isStreaming, 
    error, 
    devices, 
    videoRef, 
    startStream, 
    stopStream 
  } = useVideoStream();

  const [sessionActive, setSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [focusLostTime, setFocusLostTime] = useState(0);
  const [noFaceTime, setNoFaceTime] = useState(0);

  const focusTimerRef = useRef(null);
  const noFaceTimerRef = useRef(null);

  // Face detection callback
  const handleFaceDetection = (detectionStats) => {
    const { facesCount, confidence } = detectionStats;

    // Check for no face detected
    if (facesCount === 0) {
      if (!noFaceTimerRef.current) {
        noFaceTimerRef.current = setTimeout(() => {
          logEvent('no_face', 'No face detected for more than 10 seconds', 0);
          setNoFaceTime(prev => prev + 10);
        }, 10000); // 10 seconds
      }
    } else {
      if (noFaceTimerRef.current) {
        clearTimeout(noFaceTimerRef.current);
        noFaceTimerRef.current = null;
      }
    }

    // Check for multiple faces
    if (facesCount > 1) {
      logEvent('multiple_faces', `${facesCount} faces detected`, confidence);
    }

    // Check for low confidence (possible looking away)
    if (facesCount === 1 && confidence < 0.3) {
      if (!focusTimerRef.current) {
        focusTimerRef.current = setTimeout(() => {
          logEvent('focus_lost', 'Low confidence face detection - possible looking away', confidence);
          setFocusLostTime(prev => prev + 5);
        }, 5000); // 5 seconds
      }
    } else {
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
    }
  };

  const { 
    isDetecting, 
    detectionStats, 
    startDetection, 
    stopDetection 
  } = useFaceDetection(videoRef, handleFaceDetection);

  // Log events to backend
  const logEvent = async (eventType, description, confidence, source = 'system') => {
    const eventData = {
      eventType,
      description,
      confidence: Math.round(confidence * 100) / 100,
      source
    };

    // Add to local events
    setEvents(prev => [...prev, { ...eventData, timestamp: new Date() }]);

    // Call parent callback
    if (onEventLog) {
      onEventLog(eventData);
    }

    // Send to backend
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`http://localhost:5005/api/sessions/${sessionId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventData),
      });
    } catch (error) {
      console.error('Failed to log event:', error);
    }
  };

  // Handle simulated violations
  const handleSimulatedViolation = (violationData) => {
    logEvent(violationData.eventType, violationData.description, violationData.confidence, 'simulation');
    
    // Update local counters based on violation type
    switch (violationData.eventType) {
      case 'focus_lost':
        setFocusLostTime(prev => prev + 5);
        break;
      case 'no_face':
        setNoFaceTime(prev => prev + 10);
        break;
      default:
        break;
    }
  };

  const handleStartSession = async () => {
    try {
      await startStream(selectedDevice || undefined);
      await startDetection();
      setSessionActive(true);
      
      // Update session status in backend
      const token = localStorage.getItem('authToken');
      await fetch(`http://localhost:5005/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'active',
          startTime: new Date().toISOString()
        }),
      });
      
    } catch (err) {
      console.error('Failed to start session:', err);
    }
  };

  const handleStopSession = async () => {
    stopDetection();
    stopStream();
    setSessionActive(false);
    
    // Clear timers
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    if (noFaceTimerRef.current) clearTimeout(noFaceTimerRef.current);

    // Update session status in backend
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`http://localhost:5005/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'completed',
          endTime: new Date().toISOString()
        }),
      });
    } catch (error) {
      console.error('Failed to update session status:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Video Container */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Interviewer Monitoring</h2>
          <div className="flex items-center space-x-2">
            <div className={`h-3 w-3 rounded-full ${sessionActive ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
            <span className="text-sm text-gray-600">
              {sessionActive ? 'Monitoring Active' : 'Stopped'}
            </span>
          </div>
        </div>

        {/* Camera Selection */}
        {devices.length > 1 && !sessionActive && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Camera
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="input-field"
            >
              <option value="">Default Camera</option>
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId.substring(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Video Display */}
        <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {/* Demo Mode Overlay */}
          <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded text-sm">
            DEMO - Your Camera
          </div>
          
          {/* Overlay Information */}
          {sessionActive && (
            <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded">
              <div className="text-sm space-y-1">
                <div>Faces: {detectionStats.facesCount}</div>
                <div>Confidence: {(detectionStats.confidence * 100).toFixed(1)}%</div>
                <div>Detection: {isDetecting ? 'Active' : 'Inactive'}</div>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex justify-center space-x-4 mt-4">
          {!sessionActive ? (
            <button
              onClick={handleStartSession}
              className="btn-success"
              disabled={!sessionId}
            >
              Start Monitoring Session
            </button>
          ) : (
            <button
              onClick={handleStopSession}
              className="btn-danger"
            >
              Stop Session
            </button>
          )}
        </div>
      </div>

      {/* Statistics Panel */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Session Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{events.length}</div>
            <div className="text-sm text-gray-600">Total Events</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{focusLostTime}s</div>
            <div className="text-sm text-gray-600">Focus Lost</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{noFaceTime}s</div>
            <div className="text-sm text-gray-600">No Face</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {detectionStats.facesCount}
            </div>
            <div className="text-sm text-gray-600">Current Faces</div>
          </div>
        </div>
      </div>

      {/* Violation Simulator */}
      <ViolationSimulator 
        onSimulateViolation={handleSimulatedViolation}
        sessionActive={sessionActive}
      />
    </div>
  );
};

export default VideoCapture;