import { useEffect, useState, useCallback } from 'react';

export type MicrophonePermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

export const useMicrophonePermission = () => {
  const [permissionState, setPermissionState] = useState<MicrophonePermissionState>('unknown');
  const [isRequesting, setIsRequesting] = useState(false);

  // Check current permission status
  useEffect(() => {
    const checkPermission = async () => {
      try {
        if ('permissions' in navigator) {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setPermissionState(result.state as MicrophonePermissionState);
          
          // Listen for changes
          result.onchange = () => {
            setPermissionState(result.state as MicrophonePermissionState);
          };
        }
      } catch (e) {
        // Some browsers don't support querying microphone permission
        console.log('Cannot query microphone permission');
      }
    };

    checkPermission();
  }, []);

  // Request microphone permission
  const requestPermission = useCallback(async () => {
    if (isRequesting) return false;
    
    setIsRequesting(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately stop the stream - we just wanted permission
      stream.getTracks().forEach(track => track.stop());
      setPermissionState('granted');
      setIsRequesting(false);
      return true;
    } catch (err: any) {
      console.log('Microphone permission denied:', err.message);
      if (err.name === 'NotAllowedError') {
        setPermissionState('denied');
      }
      setIsRequesting(false);
      return false;
    }
  }, [isRequesting]);

  return {
    permissionState,
    isRequesting,
    requestPermission,
  };
};
