import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface VoiceCallState {
  isInCall: boolean;
  roomId: string | null;
  roomName: string;
  isMinimized: boolean;
  isMuted: boolean;
  callDuration: number;
}

interface VoiceCallContextValue extends VoiceCallState {
  setCallState: (state: Partial<VoiceCallState>) => void;
  minimizeCall: () => void;
  expandCall: () => void;
  endCall: () => void;
}

const VoiceCallContext = createContext<VoiceCallContextValue | null>(null);

export function VoiceCallProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VoiceCallState>({
    isInCall: false,
    roomId: null,
    roomName: '',
    isMinimized: false,
    isMuted: false,
    callDuration: 0,
  });

  const setCallState = useCallback((newState: Partial<VoiceCallState>) => {
    setState(prev => ({ ...prev, ...newState }));
  }, []);

  const minimizeCall = useCallback(() => {
    setState(prev => ({ ...prev, isMinimized: true }));
  }, []);

  const expandCall = useCallback(() => {
    setState(prev => ({ ...prev, isMinimized: false }));
  }, []);

  const endCall = useCallback(() => {
    setState({
      isInCall: false,
      roomId: null,
      roomName: '',
      isMinimized: false,
      isMuted: false,
      callDuration: 0,
    });
  }, []);

  return (
    <VoiceCallContext.Provider value={{ ...state, setCallState, minimizeCall, expandCall, endCall }}>
      {children}
    </VoiceCallContext.Provider>
  );
}

export function useVoiceCallContext() {
  const context = useContext(VoiceCallContext);
  if (!context) {
    throw new Error('useVoiceCallContext must be used within VoiceCallProvider');
  }
  return context;
}