import { useRealFaceDetection } from './useRealFaceDetection';
import { useRealObjectDetection } from './useRealObjectDetection';
import { useFaceDetection } from './useFaceDetection';

export const useHybridDetection = (videoElement, onFaceDetection, onObjectDetection) => {
  // Try real AI first
  const realFaceDetection = useRealFaceDetection(videoElement, onFaceDetection);
  const realObjectDetection = useRealObjectDetection(videoElement, onObjectDetection);
  
  // Fallback to simulation
  const simulatedDetection = useFaceDetection(
    videoElement, 
    realFaceDetection.aiLoaded ? null : onFaceDetection
  );

  const startDetection = () => {
    if (realFaceDetection.aiLoaded) {
      console.log('🤖 Using Real AI Detection');
      realFaceDetection.startDetection();
    } else {
      console.log('🎭 Using Simulated Detection (AI fallback)');
      simulatedDetection.startDetection();
    }
    
    if (realObjectDetection.aiLoaded) {
      realObjectDetection.startDetection();
    }
  };

  const stopDetection = () => {
    realFaceDetection.stopDetection();
    realObjectDetection.stopDetection();
    simulatedDetection.stopDetection();
  };

  return {
    startDetection,
    stopDetection,
    isDetecting: realFaceDetection.isDetecting || simulatedDetection.isDetecting,
    detectionStats: realFaceDetection.aiLoaded 
      ? realFaceDetection.detectionStats 
      : simulatedDetection.detectionStats,
    aiStatus: {
      faceDetection: realFaceDetection.aiLoaded,
      objectDetection: realObjectDetection.aiLoaded,
      isUsingAI: realFaceDetection.aiLoaded || realObjectDetection.aiLoaded
    }
  };
};