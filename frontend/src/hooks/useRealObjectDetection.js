import { useEffect, useRef, useState } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export const useRealObjectDetection = (videoElement, onDetection) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);
  const modelRef = useRef(null);
  const intervalRef = useRef(null);
  const lastDetectionRef = useRef(0);

  // Load COCO-SSD model
  useEffect(() => {
    let mounted = true;

    const loadModel = async () => {
      try {
        console.log('Loading COCO-SSD object detection model...');
        const model = await cocoSsd.load();
        
        if (mounted) {
          modelRef.current = model;
          setAiLoaded(true);
          console.log('✅ Object detection model loaded');
        }
      } catch (error) {
        console.error('❌ Failed to load object detection model:', error);
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

  // Enhanced object detection
  const detectObjects = async () => {
    if (!videoElement?.current || !modelRef.current) return;

    try {
      const video = videoElement.current;
      
      if (video.readyState !== 4) return;

      // Run object detection
      const predictions = await modelRef.current.detect(video);
      
      console.log('🔍 Object detection scan:', predictions.map(p => `${p.class} (${(p.score*100).toFixed(0)}%)`));
      
      // Enhanced filtering for prohibited items
      const prohibitedItems = predictions.filter(pred => {
        const className = pred.class.toLowerCase();
        const confidence = pred.score;
        
        // Lower confidence threshold for better detection
        return (
          confidence > 0.3 && (
            // Phone detection
            className.includes('cell phone') ||
            className.includes('phone') ||
            className.includes('mobile') ||
            // Paper/book detection (more sensitive)
            className.includes('book') ||
            className.includes('paper') ||
            // Electronic devices
            className.includes('laptop') ||
            className.includes('computer') ||
            className.includes('keyboard') ||
            className.includes('mouse') ||
            className.includes('tablet') ||
            // Additional items that could be notes
            className.includes('clipboard') ||
            className.includes('magazine') ||
            className.includes('newspaper')
          )
        );
      });

      // Also detect objects that might be held (indicating notes/paper)
      const handHeldItems = predictions.filter(pred => {
        const className = pred.class.toLowerCase();
        const confidence = pred.score;
        
        // Objects commonly held in hand that could be notes
        return (
          confidence > 0.25 && (
            className.includes('bottle') ||
            className.includes('cup') ||
            className.includes('remote') ||
            className.includes('scissors') ||
            className.includes('pen') ||
            className.includes('pencil')
          )
        );
      });

      // Process prohibited items
      if (prohibitedItems.length > 0) {
        const now = Date.now();
        // Reduce spam interval to 20 seconds for better responsiveness
        if (now - lastDetectionRef.current > 20000) {
          prohibitedItems.forEach(item => {
            let eventType = 'phone_detected';
            let description = `${item.class} detected in frame`;
            
            // Categorize the detection
            if (item.class.toLowerCase().includes('book') || 
                item.class.toLowerCase().includes('paper') ||
                item.class.toLowerCase().includes('clipboard') ||
                item.class.toLowerCase().includes('magazine') ||
                item.class.toLowerCase().includes('newspaper')) {
              eventType = 'notes_detected';
              description = `Written material (${item.class}) detected`;
            } else if (item.class.toLowerCase().includes('laptop') || 
                      item.class.toLowerCase().includes('computer') ||
                      item.class.toLowerCase().includes('tablet')) {
              eventType = 'phone_detected';
              description = `Electronic device (${item.class}) detected`;
            }
            
            console.log(`🚨 Prohibited item detected: ${item.class} (${(item.score*100).toFixed(0)}%)`);
            
            if (onDetection) {
              onDetection({
                eventType,
                description,
                confidence: item.score,
                isRealAI: true,
                boundingBox: item.bbox,
                objectClass: item.class
              });
            }
          });
          
          lastDetectionRef.current = now;
        }
      }

      // Check for hand-held items (might be notes)
      if (handHeldItems.length > 0) {
        const now = Date.now();
        if (now - lastDetectionRef.current > 25000) { // Different interval for hand-held items
          // Only report if multiple hand-held items (more suspicious)
          if (handHeldItems.length >= 1) {
            console.log(`📝 Possible notes detected: hand-held objects (${handHeldItems.map(i => i.class).join(', ')})`);
            
            if (onDetection) {
              onDetection({
                eventType: 'notes_detected',
                description: `Possible written material detected (hand-held objects)`,
                confidence: Math.max(...handHeldItems.map(i => i.score)),
                isRealAI: true,
                objectClass: handHeldItems.map(i => i.class).join(', ')
              });
            }
            
            lastDetectionRef.current = now;
          }
        }
      }

      console.log('🔍 Object detection completed:', {
        totalObjects: predictions.length,
        prohibitedItems: prohibitedItems.length,
        handHeldItems: handHeldItems.length
      });

    } catch (error) {
      console.error('Object detection error:', error);
    }
  };

  // Start detection loop
  useEffect(() => {
    if (!aiLoaded || !isDetecting) return;

    console.log('🔍 Starting enhanced real object detection');
    
    // Run detection more frequently for better responsiveness
    intervalRef.current = setInterval(detectObjects, 8000); // Every 8 seconds
    
    // Run first detection after 3 seconds
    setTimeout(detectObjects, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log('🔍 Object detection stopped');
      }
    };
  }, [aiLoaded, isDetecting, videoElement, onDetection]);

  const startDetection = () => {
    console.log('🔍 Starting enhanced object detection');
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
    startDetection,
    stopDetection,
    aiLoaded,
    isUsingAI: aiLoaded
  };
};