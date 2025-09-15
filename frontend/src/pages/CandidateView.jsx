import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
// import { useFaceDetection } from '../hooks/useFaceDetection';
import { useHybridDetection } from '../hooks/useHybridDetection';

const CandidateView = () => {
    const { sessionId } = useParams();
    const [session, setSession] = useState(null);
    const [candidateInfo, setCandidateInfo] = useState({
        name: '',
        email: ''
    });
    const [sessionState, setSessionState] = useState('loading');
    const [error, setError] = useState('');
    const [events, setEvents] = useState([]);
    const [sessionStats, setSessionStats] = useState({
        violations: 0,
        focusLost: 0,
        noFace: 0,
        multipleFaces: 0,      // Add this
        phoneDetected: 0,      // Add this  
        notesDetected: 0,      // Add this
        startTime: null
    });

    // Direct video handling
    const [stream, setStream] = useState(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [videoError, setVideoError] = useState('');
    const videoRef = useRef(null);

    // Face detection with violation tracking
    const handleFaceDetection = (detectionStats) => {
        if (sessionState !== 'active') return;

        const { facesCount, confidence, isRealAI } = detectionStats;
        console.log('🎯 Processing face detection:', { facesCount, confidence: (confidence * 100).toFixed(1) + '%', isRealAI });

        // Clear existing timers if we have good detection
        if (facesCount === 1 && confidence > 0.5) {
            if (faceTimerRef.current) {
                console.log('✅ Face detected - clearing no-face timer');
                clearTimeout(faceTimerRef.current);
                faceTimerRef.current = null;
            }
            if (focusTimerRef.current) {
                console.log('✅ Good focus detected - clearing focus-lost timer');
                clearTimeout(focusTimerRef.current);
                focusTimerRef.current = null;
            }
            return; // Don't process violations for normal scenarios
        }

        // Handle No Face Detection (>8 seconds for real AI, >10 for simulation)
        if (facesCount === 0) {
            if (!faceTimerRef.current) {
                const timeout = isRealAI ? 8000 : 10000; // Shorter timeout for real AI
                console.log(`⚠️ Starting no-face timer (${timeout / 1000} seconds)`);
                faceTimerRef.current = setTimeout(() => {
                    console.log('🚨 No face violation triggered');
                    logViolation('no_face', 'No face detected for more than ' + (timeout / 1000) + ' seconds', 0);
                    setSessionStats(prev => {
                        const updated = {
                            ...prev,
                            noFace: prev.noFace + 1,
                            violations: prev.violations + 1
                        };
                        console.log('📊 Updated stats (no face):', updated);
                        return updated;
                    });
                    faceTimerRef.current = null;
                }, timeout);
            }
        }

        // Handle Multiple Faces (immediate detection)
        if (facesCount > 1) {
            const now = Date.now();
            if (!multipleFacesLastLoggedRef.current || (now - multipleFacesLastLoggedRef.current) > 25000) {
                console.log('🚨 Multiple faces violation triggered');
                logViolation('multiple_faces', `${facesCount} faces detected in frame`, confidence);
                setSessionStats(prev => {
                    const updated = {
                        ...prev,
                        multipleFaces: (prev.multipleFaces || 0) + 1,
                        violations: prev.violations + 1
                    };
                    console.log('📊 Updated stats (multiple faces):', updated);
                    return updated;
                });
                multipleFacesLastLoggedRef.current = now;
            }
        }

        // Handle Focus Lost / Looking Away (more sensitive)
        if (facesCount === 1 && confidence < 0.4) { // Increased threshold for better sensitivity
            if (!focusTimerRef.current) {
                const timeout = isRealAI ? 4000 : 5000; // Shorter timeout for real AI
                console.log(`⚠️ Starting focus-lost timer (${timeout / 1000} seconds) - confidence: ${(confidence * 100).toFixed(1)}%`);
                focusTimerRef.current = setTimeout(() => {
                    console.log('🚨 Focus lost violation triggered');
                    logViolation('focus_lost', 'Looking away from screen for more than ' + (timeout / 1000) + ' seconds', confidence);
                    setSessionStats(prev => {
                        const updated = {
                            ...prev,
                            focusLost: prev.focusLost + 1,
                            violations: prev.violations + 1
                        };
                        console.log('📊 Updated stats (focus lost):', updated);
                        return updated;
                    });
                    focusTimerRef.current = null;
                }, timeout);
            }
        }
    };


    const handleObjectDetection = (detectionData) => {
        if (sessionState !== 'active') return;

        console.log('🔍 Object detected:', detectionData);

        // Log the violation
        logViolation(detectionData.eventType, detectionData.description, detectionData.confidence);

        // Update stats
        const statKey = detectionData.eventType === 'phone_detected' ? 'phoneDetected' : 'notesDetected';
        setSessionStats(prev => ({
            ...prev,
            [statKey]: prev[statKey] + 1,
            violations: prev.violations + 1
        }));
    };

    const {
        isDetecting,
        detectionStats,
        startDetection,
        stopDetection,
        aiStatus
    } = useHybridDetection(videoRef, handleFaceDetection, handleObjectDetection);

    const faceTimerRef = useRef(null);
    const focusTimerRef = useRef(null);
    const multipleFacesLastLoggedRef = useRef(0);
    const itemDetectionIntervalRef = useRef(null);

    // Test violations manually
    const testViolation = (type) => {
        console.log('Testing violation:', type);

        switch (type) {
            case 'focus':
                logViolation('focus_lost', 'TEST: Simulated focus lost violation', 0.2);
                setSessionStats(prev => ({
                    ...prev,
                    focusLost: prev.focusLost + 1,
                    violations: prev.violations + 1
                }));
                break;
            case 'noface':
                logViolation('no_face', 'TEST: Simulated no face violation', 0);
                setSessionStats(prev => ({
                    ...prev,
                    noFace: prev.noFace + 1,
                    violations: prev.violations + 1
                }));
                break;
            case 'multiple':
                logViolation('multiple_faces', 'TEST: Simulated multiple faces violation', 0.8);
                setSessionStats(prev => ({
                    ...prev,
                    multipleFaces: prev.multipleFaces + 1,
                    violations: prev.violations + 1
                }));
                break;
            case 'phone':
                logViolation('phone_detected', 'TEST: Simulated phone detection', 0.9);
                setSessionStats(prev => ({
                    ...prev,
                    phoneDetected: prev.phoneDetected + 1,
                    violations: prev.violations + 1
                }));
                break;
            case 'notes':
                logViolation('notes_detected', 'TEST: Simulated notes detection', 0.85);
                setSessionStats(prev => ({
                    ...prev,
                    notesDetected: prev.notesDetected + 1,
                    violations: prev.violations + 1
                }));
                break;
        }
    };


    // Add item detection simulation
    // Update this function in CandidateView.jsx
    const startItemDetection = () => {
        console.log('Starting item detection...');

        itemDetectionIntervalRef.current = setInterval(() => {
            if (sessionState !== 'active') return;

            const random = Math.random();

            // Very low chance of detecting prohibited items (2% chance per check)
            if (random < 0.02) {
                const items = [
                    {
                        type: 'phone_detected',
                        description: 'Mobile phone detected in frame',
                        statKey: 'phoneDetected'
                    },
                    {
                        type: 'notes_detected',
                        description: 'Written notes or books detected',
                        statKey: 'notesDetected'
                    },
                    {
                        type: 'phone_detected',
                        description: 'Electronic device detected',
                        statKey: 'phoneDetected'
                    }
                ];

                const detectedItem = items[Math.floor(Math.random() * items.length)];

                console.log('Item detected:', detectedItem.type);
                logViolation(detectedItem.type, detectedItem.description, 0.9);

                // Update the specific stat counter
                setSessionStats(prev => {
                    const updated = {
                        ...prev,
                        [detectedItem.statKey]: (prev[detectedItem.statKey] || 0) + 1,
                        violations: prev.violations + 1
                    };
                    console.log(`Updated stats (${detectedItem.type}):`, updated);
                    return updated;
                });
            }
        }, 15000); // Check every 15 seconds
    };


    const stopItemDetection = () => {
        if (itemDetectionIntervalRef.current) {
            clearInterval(itemDetectionIntervalRef.current);
            itemDetectionIntervalRef.current = null;
            console.log('Item detection stopped');
        }
    };

    // Video functions
    const startVideo = async () => {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('Starting video stream...');
                setVideoError('');

                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: 'user'
                    },
                    audio: false
                });

                console.log('Got media stream:', mediaStream);

                // Wait for video element to be available if we're not in active state yet
                const waitForVideoElement = () => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = mediaStream;

                        const onLoadedMetadata = () => {
                            console.log('Video metadata loaded');
                            videoRef.current.play()
                                .then(() => {
                                    console.log('Video playing successfully');
                                    setStream(mediaStream);
                                    setIsStreaming(true);
                                    resolve(mediaStream);
                                })
                                .catch(e => {
                                    console.error('Play failed:', e);
                                    setVideoError('Failed to play video');
                                    reject(e);
                                });
                        };

                        videoRef.current.onloadedmetadata = onLoadedMetadata;

                        if (videoRef.current.readyState >= 1) {
                            onLoadedMetadata();
                        }
                    } else {
                        // Video element not ready yet, try again in 100ms
                        setTimeout(waitForVideoElement, 100);
                    }
                };

                waitForVideoElement();

            } catch (err) {
                console.error('Failed to start video:', err);
                const errorMsg = `Camera access failed: ${err.message}`;
                setVideoError(errorMsg);
                reject(err);
            }
        });
    };

    const stopVideo = () => {
        console.log('Stopping video stream');
        if (stream) {
            stream.getTracks().forEach(track => {
                track.stop();
            });
            setStream(null);
            setIsStreaming(false);

            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        }
    };

    // Fetch session details
    useEffect(() => {
        const fetchSession = async () => {
            try {
                const response = await fetch(`http://localhost:5005/api/sessions/${sessionId}/public`);
                const data = await response.json();

                if (data.success) {
                    const sessionData = data.data;
                    setSession(sessionData);

                    if (sessionData.status === 'completed') {
                        setSessionState('completed');
                        setError('This session has already been completed and cannot be retaken.');
                    } else if (sessionData.status === 'expired') {
                        setSessionState('error');
                        setError('This session has expired.');
                    } else if (sessionData.status === 'active') {
                        setSessionState('error');
                        setError('This session is currently active in another browser.');
                    } else {
                        setSessionState('ready');
                        setCandidateInfo({
                            name: sessionData.candidateName || '',
                            email: sessionData.candidateEmail || ''
                        });
                    }
                } else {
                    setSessionState('error');
                    setError('Session not found or not accessible');
                }
            } catch (err) {
                setSessionState('error');
                setError('Failed to load session');
            }
        };

        if (sessionId) {
            fetchSession();
        }
    }, [sessionId]);

    // Cleanup
    useEffect(() => {
        return () => {
            stopVideo();
            if (faceTimerRef.current) clearTimeout(faceTimerRef.current);
            if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
        };
    }, []);

    // Log violation event
    const logViolation = async (eventType, description, confidence) => {
        const eventData = {
            eventType,
            description,
            confidence: Math.round(confidence * 100) / 100,
            source: 'system'
        };

        const newEvent = { ...eventData, timestamp: new Date() };
        setEvents(prev => [...prev, newEvent]);

        try {
            await fetch(`http://localhost:5005/api/sessions/${sessionId}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventData),
            });
        } catch (error) {
            console.error('Failed to log violation:', error);
        }
    };


    const handleStartSession = async (e) => {
        e.preventDefault();

        if (!candidateInfo.name || !candidateInfo.email) {
            alert('Please enter your name and email');
            return;
        }

        try {
            console.log('Starting session...');

            // First change to active state so video element is rendered
            setSessionState('active');
            setSessionStats(prev => ({ ...prev, startTime: new Date() }));

            // Small delay to ensure video element is rendered
            await new Promise(resolve => setTimeout(resolve, 200));

            // Start video
            await startVideo();

            // Start session in backend
            const response = await fetch(`http://localhost:5005/api/sessions/${sessionId}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    candidateInfo: {
                        name: candidateInfo.name,
                        email: candidateInfo.email
                    }
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Start both face detection and item detection
                setTimeout(() => {
                    startDetection();
                    startItemDetection(); // Add this line
                }, 1000);

                console.log('Session started successfully with all monitoring active');
            } else {
                throw new Error(data.message);
            }

        } catch (err) {
            console.error('Failed to start session:', err);
            alert('Failed to start session: ' + err.message);
            setSessionState('ready');
            stopVideo();
        }
    };

    const handleEndSession = async () => {
        try {
            stopDetection();
            stopVideo();
            stopItemDetection(); // Add this line

            if (faceTimerRef.current) clearTimeout(faceTimerRef.current);
            if (focusTimerRef.current) clearTimeout(focusTimerRef.current);

            const response = await fetch(`http://localhost:5005/api/sessions/${sessionId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (data.success) {
                setSessionState('completed');
            } else {
                throw new Error(data.message);
            }

        } catch (err) {
            console.error('Failed to end session:', err);
            alert('Failed to end session properly');
            setSessionState('completed');
        }
    };

    if (sessionState === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading session...</p>
                </div>
            </div>
        );
    }

    if (sessionState === 'error' || sessionState === 'completed') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-md mx-auto">
                    <div className="text-6xl mb-4">
                        {sessionState === 'completed' ? '✅' : '❌'}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {sessionState === 'completed' ? 'Session Completed' : 'Session Not Available'}
                    </h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    {sessionState === 'completed' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-green-800 font-medium">Thank you for completing the interview!</p>
                            <p className="text-green-600 text-sm mt-1">
                                Your session has been recorded and the interviewer will review your performance.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-4">
                        <h1 className="text-2xl font-bold text-gray-900">
                            Video Interview Session
                        </h1>
                        <p className="text-gray-600">
                            {session?.interviewerName && `Interview with ${session.interviewerName}`}
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                {sessionState === 'ready' ? (
                    /* Join Session Form */
                    <div className="max-w-md mx-auto">
                        <div className="card">
                            <h2 className="text-xl font-semibold mb-4">Start Your Interview</h2>

                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-600 text-lg">ℹ️</span>
                                    <div className="text-sm text-blue-800">
                                        <p className="font-medium">Before you begin:</p>
                                        <ul className="mt-1 space-y-1">
                                            <li>• Ensure good lighting on your face</li>
                                            <li>• Find a quiet, private location</li>
                                            <li>• Close other applications</li>
                                            <li>• Allow camera access when prompted</li>
                                            <li>• <strong>You can only take this session once</strong></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleStartSession} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Your Full Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        className="input-field"
                                        placeholder="Enter your full name"
                                        value={candidateInfo.name}
                                        onChange={(e) => setCandidateInfo({
                                            ...candidateInfo,
                                            name: e.target.value
                                        })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        className="input-field"
                                        placeholder="Enter your email"
                                        value={candidateInfo.email}
                                        onChange={(e) => setCandidateInfo({
                                            ...candidateInfo,
                                            email: e.target.value
                                        })}
                                    />
                                </div>

                                <button type="submit" className="w-full btn-primary">
                                    Start Interview Session
                                </button>
                            </form>

                            <div className="mt-4 text-center text-sm text-gray-500">
                                Session ID: {sessionId}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Active Interview Interface */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Video Feed */}
                        <div className="lg:col-span-2">
                            <div className="card">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-semibold">Your Video Feed</h2>
                                    <div className="flex items-center space-x-4">
                                        <div className="flex items-center space-x-2">
                                            <div className={`h-3 w-3 rounded-full ${isStreaming ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                            <span className="text-sm text-gray-600">
                                                {isStreaming ? 'Recording' : 'Starting...'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={handleEndSession}
                                            className="btn-danger"
                                        >
                                            End Session
                                        </button>
                                    </div>
                                </div>

                                {/* Video Display */}
                                <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                    />

                                    {!isStreaming && (
                                        <div className="absolute inset-0 flex items-center justify-center text-white">
                                            <div className="text-center">
                                                <div className="text-4xl mb-2">📹</div>
                                                <div>Starting Camera...</div>
                                                <div className="text-sm mt-2">Please wait</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Recording Indicator */}
                                    {isStreaming && (
                                        <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded text-sm font-medium">
                                            ● LIVE
                                        </div>
                                    )}

                                    {/* Face Detection Info */}
                                    {isStreaming && (
                                        <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded">
                                            <div className="text-sm space-y-1">
                                                <div>Faces: {detectionStats.facesCount}</div>
                                                <div>Focus: {(detectionStats.confidence * 100).toFixed(0)}%</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Add this after the Face Detection Info overlay */}
                                    {sessionState === 'active' && isStreaming && (
                                        <div className="absolute top-4 right-4 bg-black bg-opacity-90 text-white px-3 py-2 rounded text-xs">
                                            <div className="space-y-1">
                                                <div className="font-bold">🤖 AI Status:</div>
                                                <div>Face: {aiStatus.faceDetection ? '🟢 Real AI' : '🟡 Simulated'}</div>
                                                <div>Objects: {aiStatus.objectDetection ? '🟢 Real AI' : '🟡 Simulated'}</div>
                                                {aiStatus.isUsingAI && (
                                                    <div className="border-t border-gray-600 pt-1 mt-1">
                                                        <div>Faces: {detectionStats.facesCount}</div>
                                                        <div>Focus: {(detectionStats.confidence * 100).toFixed(0)}%</div>
                                                        <div className="text-xs text-gray-300">
                                                            {detectionStats.facesCount === 0 ? 'NO FACE' :
                                                                detectionStats.facesCount > 1 ? 'MULTIPLE' :
                                                                    detectionStats.confidence < 0.4 ? 'UNFOCUSED' : 'NORMAL'}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}


                                    {/* Candidate Info */}
                                    <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded">
                                        <div className="text-sm">
                                            <div>{candidateInfo.name}</div>
                                            <div className="text-xs text-gray-300">{candidateInfo.email}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Debug Info */}
                                <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                                    <div>Stream: {stream ? '✅ Active' : '❌ None'}</div>
                                    <div>Video Element: {videoRef.current ? '✅ Ready' : '❌ Not Ready'}</div>
                                    <div>Is Streaming: {isStreaming ? '✅ Yes' : '❌ No'}</div>
                                    <div>Session State: {sessionState}</div>
                                    {videoError && <div className="text-red-600">❌ Error: {videoError}</div>}
                                </div>

                                {videoError && (
                                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-red-600 text-sm">{videoError}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stats & Guidelines */}
                        <div className="lg:col-span-1 space-y-6">

                            {/* Session Stats */}
                            {/* Update the Session Stats card to show all metrics */}
                            <div className="card">
                                <h3 className="font-semibold mb-4">Session Status</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Duration:</span>
                                        <span className="font-medium">
                                            {sessionStats.startTime &&
                                                Math.floor((new Date() - sessionStats.startTime) / 60000)} min
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Violations:</span>
                                        <span className="font-medium text-red-600">{sessionStats.violations}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Focus Lost:</span>
                                        <span className="font-medium text-orange-600">{sessionStats.focusLost}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">No Face:</span>
                                        <span className="font-medium text-red-600">{sessionStats.noFace}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Multiple Faces:</span>
                                        <span className="font-medium text-purple-600">{sessionStats.multipleFaces}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Phone Detected:</span>
                                        <span className="font-medium text-red-600">{sessionStats.phoneDetected}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Notes Detected:</span>
                                        <span className="font-medium text-red-600">{sessionStats.notesDetected}</span>
                                    </div>
                                </div>
                            </div>


                            {/* Test Violations */}
                            {/* Update the Test Violations card */}
                            {/* <div className="card">
                                <h3 className="font-semibold mb-4">Test Violations (Debug)</h3>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => testViolation('focus')}
                                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded text-sm"
                                    >
                                        Test Focus Lost ({sessionStats.focusLost})
                                    </button>
                                    <button
                                        onClick={() => testViolation('noface')}
                                        className="w-full bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm"
                                    >
                                        Test No Face ({sessionStats.noFace})
                                    </button>
                                    <button
                                        onClick={() => testViolation('multiple')}
                                        className="w-full bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded text-sm"
                                    >
                                        Test Multiple Faces ({sessionStats.multipleFaces})
                                    </button>
                                    <button
                                        onClick={() => testViolation('phone')}
                                        className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
                                    >
                                        Test Phone ({sessionStats.phoneDetected})
                                    </button>
                                    <button
                                        onClick={() => testViolation('notes')}
                                        className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
                                    >
                                        Test Notes ({sessionStats.notesDetected})
                                    </button>
                                </div>
                                <div className="mt-3 text-xs text-gray-500">
                                    Total: {sessionStats.violations} violations
                                </div>
                            </div> */}


                            {/* Guidelines */}
                            <div className="card">
                                <h3 className="font-semibold mb-4">Interview Guidelines</h3>
                                <div className="space-y-4 text-sm">
                                    <div>
                                        <h4 className="font-medium text-green-600 mb-2">✅ Do:</h4>
                                        <ul className="space-y-1 text-gray-600">
                                            <li>• Look directly at the camera</li>
                                            <li>• Keep your face clearly visible</li>
                                            <li>• Stay in the camera frame</li>
                                            <li>• Maintain good posture</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-red-600 mb-2">❌ Avoid:</h4>
                                        <ul className="space-y-1 text-gray-600">
                                            <li>• Looking away for long periods</li>
                                            <li>• Having others in the frame</li>
                                            <li>• Using mobile devices</li>
                                            <li>• Referring to notes or books</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Events */}
                            {events.length > 0 && (
                                <div className="card">
                                    <h3 className="font-semibold mb-4">Recent Alerts</h3>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {events.slice(-5).reverse().map((event, index) => (
                                            <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                                                <div className="font-medium text-red-800">
                                                    {event.eventType.replace('_', ' ').toUpperCase()}
                                                </div>
                                                <div className="text-red-600 text-xs">
                                                    {new Date(event.timestamp).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default CandidateView;