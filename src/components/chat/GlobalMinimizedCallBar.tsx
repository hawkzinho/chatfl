import { useVoiceCallContext } from "@/contexts/VoiceCallContext";
import { MinimizedCallBar } from "./MinimizedCallBar";

export function GlobalMinimizedCallBar() {
  const { 
    isInCall, 
    isMinimized, 
    roomName, 
    isMuted, 
    callDuration, 
    expandCall,
    callFunctionsRef
  } = useVoiceCallContext();

  if (!isInCall || !isMinimized) {
    return null;
  }

  const handleToggleMute = () => {
    callFunctionsRef.current.toggleMute?.();
  };

  const handleLeaveCall = async () => {
    await callFunctionsRef.current.leaveCall?.();
  };

  const handleExpand = () => {
    expandCall();
  };

  return (
    <MinimizedCallBar
      roomName={roomName}
      isMuted={isMuted}
      callDuration={callDuration}
      onToggleMute={handleToggleMute}
      onLeaveCall={handleLeaveCall}
      onExpand={handleExpand}
    />
  );
}