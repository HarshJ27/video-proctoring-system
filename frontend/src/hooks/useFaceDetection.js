import { useEffect, useRef, useState } from 'react';

export const useFaceDetection = (videoElement, onDetection) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionStats, setDetectionStats] = useState({
    facesCount: 1, // Default to 1 face detected
    lastDetection: null,
    confidence: 0.8 // Default confidence
  });
  
  const intervalRef = useRef(null);
  const currentScenarioRef = useRef('normal');
  const scenarioStartTimeRef = useRef(Date.now());
  const lastViolationTimeRef = useRef(0);

  useEffect(() => {
    if (!videoElement?.current || !isDetecting) return;

    console.log('Face detection started');

    // Simulate realistic face detection scenarios
    const detectFaces = () => {
      const now = Date.now();
      const timeSinceScenarioStart = now - scenarioStartTimeRef.current;
      const timeSinceLastViolation = now - lastViolationTimeRef.current;
      
      let scenario;
      
      // Prevent violation spam - at least 30 seconds between same type violations
      const minTimeBetweenViolations = 30000; // 30 seconds
      
      // 85% of the time: Normal scenario (face detected, good confidence)
      if (Math.random() < 0.85 || timeSinceLastViolation < minTimeBetweenViolations) {
        scenario = {
          facesCount: 1,
          confidence: 0.8 + Math.random() * 0.2, // 80-100% confidence
          type: 'normal'
        };
      }
      // 5% chance: Looking away (low confidence)
      else if (Math.random() < 0.33) {
        scenario = {
          facesCount: 1,
          confidence: 0.1 + Math.random() * 0.2, // 10-30% confidence  
          type: 'looking_away'
        };
      }
      // 5% chance: No face detected
      else if (Math.random() < 0.66) {
        scenario = {
          facesCount: 0,
          confidence: 0,
          type: 'no_face'
        };
      }
      // 5% chance: Multiple faces
      else {
        scenario = {
          facesCount: 2 + Math.floor(Math.random() * 2), // 2-3 faces
          confidence: 0.7 + Math.random() * 0.2,
          type: 'multiple_faces'
        };
      }

      // Change scenario occasionally but not too frequently
      if (timeSinceScenarioStart > 15000 && Math.random() < 0.3) { // Every 15+ seconds, 30% chance
        currentScenarioRef.current = scenario.type;
        scenarioStartTimeRef.current = now;
      }

      const stats = {
        facesCount: scenario.facesCount,
        confidence: scenario.confidence,
        lastDetection: new Date(),
        timestamp: now,
        scenarioType: scenario.type
      };

      setDetectionStats(stats);
      
      if (onDetection) {
        onDetection(stats);
      }

      console.log('Detection result:', {
        faces: stats.facesCount,
        confidence: (stats.confidence * 100).toFixed(0) + '%',
        type: stats.scenarioType
      });
    };

    // Run detection every 3 seconds (not too frequent)
    intervalRef.current = setInterval(detectFaces, 3000);
    
    // Run first detection immediately
    detectFaces();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log('Face detection stopped');
      }
    };
  }, [videoElement, isDetecting, onDetection]);

  const startDetection = () => {
    console.log('Starting face detection...');
    setIsDetecting(true);
    // Reset timers when starting
    scenarioStartTimeRef.current = Date.now();
    lastViolationTimeRef.current = 0;
  };

  const stopDetection = () => {
    console.log('Stopping face detection...');
    setIsDetecting(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  return {
    isDetecting,
    detectionStats,
    startDetection,
    stopDetection
  };
};