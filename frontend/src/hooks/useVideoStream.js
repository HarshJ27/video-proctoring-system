import { useState, useRef, useEffect } from 'react';

export const useVideoStream = () => {
  const [stream, setStream] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  
  const videoRef = useRef(null);

  // Get available video devices
  const getVideoDevices = async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceList.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      return videoDevices;
    } catch (err) {
      console.error('Error getting devices:', err);
      return [];
    }
  };

  // Start video stream
  const startStream = async (deviceId = null) => {
    try {
      setError(null);
      console.log('Starting video stream...');
      
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
          facingMode: 'user', // Front camera on mobile
          ...(deviceId && { deviceId })
        },
        audio: false
      };

      console.log('Using constraints:', constraints);

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Got media stream:', mediaStream);
      
      setStream(mediaStream);
      setIsStreaming(true);
      
      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        console.log('Set video srcObject');
        
        // Ensure video plays
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded');
          videoRef.current.play().catch(e => {
            console.error('Error playing video:', e);
          });
        };
      } else {
        console.error('Video ref is null');
      }
      
      return mediaStream;
    } catch (err) {
      const errorMsg = `Camera access failed: ${err.message}`;
      setError(errorMsg);
      console.error('Error accessing camera:', err);
      throw new Error(errorMsg);
    }
  };

  // Stop video stream
  const stopStream = () => {
    console.log('Stopping video stream');
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      setStream(null);
      setIsStreaming(false);
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    getVideoDevices();
    
    return () => {
      stopStream();
    };
  }, []);

  return {
    stream,
    isStreaming,
    error,
    devices,
    videoRef,
    startStream,
    stopStream,
    getVideoDevices
  };
};