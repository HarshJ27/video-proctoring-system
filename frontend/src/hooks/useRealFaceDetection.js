import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

export const useRealFaceDetection = (videoElement, onDetection) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);
  const [detectionStats, setDetectionStats] = useState({
    facesCount: 1,
    lastDetection: null,
    confidence: 0.8
  });
  
  const modelRef = useRef(null);
  const intervalRef = useRef(null);
  const previousDetectionRef = useRef({ facesCount: 1, confidence: 0.8 });

  // Load AI model
  useEffect(() => {
    let mounted = true;

    const loadModel = async () => {
      try {
        console.log('Loading TensorFlow.js and BlazeFace model...');
        
        // Set TensorFlow backend
        await tf.setBackend('webgl');
        await tf.ready();
        
        // Load BlazeFace model with higher accuracy
        const model = await blazeface.load();
        
        if (mounted) {
          modelRef.current = model;
          setAiLoaded(true);
          console.log('✅ AI Model loaded successfully');
        }
      } catch (error) {
        console.error('❌ Failed to load AI model:', error);
        if (mounted) {
          setAiLoaded(false);
        }
      }
    };

    loadModel();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Real face detection function
  const detectFaces = async () => {
    if (!videoElement?.current || !modelRef.current) return null;

    try {
      const video = videoElement.current;
      
      // Check if video is playing
      if (video.readyState !== 4 || video.videoWidth === 0) {
        return null;
      }

      // Run face detection with more sensitive settings
      const predictions = await modelRef.current.estimateFaces(video, false);
      
      let facesCount = predictions.length;
      let avgConfidence = 0;

      console.log(`🤖 Raw face detection: ${facesCount} faces detected`);

      if (predictions.length > 0) {
        // Calculate average confidence and analyze face positioning
        let totalConfidence = 0;
        let wellPositionedFaces = 0;

        predictions.forEach(pred => {
          // Get confidence score
          const confidence = Array.isArray(pred.probability) ? pred.probability[0] : pred.probability;
          totalConfidence += confidence;

          // Analyze face position and size for focus detection
          const bbox = pred.topLeft.concat(pred.bottomRight);
          const faceWidth = bbox[2] - bbox[0];
          const faceHeight = bbox[3] - bbox[1];
          const faceSize = faceWidth * faceHeight;
          const videoArea = video.videoWidth * video.videoHeight;
          const faceSizeRatio = faceSize / videoArea;

          // Face center
          const faceCenterX = (bbox[0] + bbox[2]) / 2;
          const faceCenterY = (bbox[1] + bbox[3]) / 2;
          
          // Video center
          const videoCenterX = video.videoWidth / 2;
          const videoCenterY = video.videoHeight / 2;

          // Distance from center (normalized)
          const distanceFromCenter = Math.sqrt(
            Math.pow(faceCenterX - videoCenterX, 2) + Math.pow(faceCenterY - videoCenterY, 2)
          ) / Math.min(video.videoWidth, video.videoHeight);

          // Face is well-positioned if:
          // 1. It's reasonably sized (at least 3% of video area)
          // 2. It's reasonably centered (within 40% of the frame)
          // 3. It has good confidence (> 0.5)
          if (faceSizeRatio > 0.03 && distanceFromCenter < 0.4 && confidence > 0.5) {
            wellPositionedFaces++;
          }

          console.log(`Face ${wellPositionedFaces}: size=${faceSizeRatio.toFixed(3)}, distance=${distanceFromCenter.toFixed(2)}, confidence=${confidence.toFixed(2)}`);
        });

        avgConfidence = totalConfidence / predictions.length;

        // Reduce confidence if faces are not well-positioned (indicates looking away)
        if (wellPositionedFaces < predictions.length) {
          avgConfidence *= 0.3; // Significantly reduce confidence for poorly positioned faces
          console.log(`🔍 Focus issue detected: ${wellPositionedFaces}/${predictions.length} faces well-positioned`);
        }

      } else {
        // No faces detected
        console.log('👤 No faces detected in frame');
      }

      const stats = {
        facesCount,
        confidence: avgConfidence,
        lastDetection: new Date(),
        timestamp: Date.now(),
        isRealAI: true,
        predictions,
        rawPredictions: predictions.length
      };

      setDetectionStats(stats);
      
      // Store previous detection for comparison
      previousDetectionRef.current = { facesCount, confidence: avgConfidence };
      
      if (onDetection) {
        onDetection(stats);
      }

      console.log('🤖 Final AI Detection:', {
        faces: facesCount,
        confidence: (avgConfidence * 100).toFixed(1) + '%',
        scenario: facesCount === 0 ? 'NO_FACE' : 
                 facesCount > 1 ? 'MULTIPLE_FACES' : 
                 avgConfidence < 0.3 ? 'LOOKING_AWAY' : 'NORMAL'
      });

      return stats;
    } catch (error) {
      console.error('Face detection error:', error);
      return null;
    }
  };

  // Start detection loop
  useEffect(() => {
    if (!aiLoaded || !isDetecting || !videoElement?.current) return;

    console.log('🤖 Starting real AI face detection with enhanced sensitivity');
    
    const runDetection = async () => {
      await detectFaces();
    };

    // Run detection more frequently for better responsiveness
    intervalRef.current = setInterval(runDetection, 1500); // Every 1.5 seconds
    
    // Run first detection immediately
    runDetection();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log('🤖 AI face detection stopped');
      }
    };
  }, [aiLoaded, isDetecting, videoElement, onDetection]);

  const startDetection = () => {
    if (aiLoaded) {
      console.log('🤖 Starting enhanced real AI detection');
    } else {
      console.log('⚠️ AI not loaded, will use fallback');
    }
    setIsDetecting(true);
  };

  const stopDetection = () => {
    setIsDetecting(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  return {
    isDetecting,
    detectionStats,
    startDetection,
    stopDetection,
    aiLoaded,
    isUsingAI: aiLoaded
  };
};