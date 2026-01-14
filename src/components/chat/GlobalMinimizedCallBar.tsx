import { useVoiceCallContext } from "@/contexts/VoiceCallContext";
import { MinimizedCallBar } from "./MinimizedCallBar";

export function GlobalMinimizedCallBar() {
  const { isInCall, isMinimized, roomName, isMuted, callDuration, setCallState, endCall, expandCall } = useVoiceCallContext();

  if (!isInCall || !isMinimized) {
    return null;
  }

  return (
    <MinimizedCallBar
      roomName={roomName}
      isMuted={isMuted}
      callDuration={callDuration}
      onToggleMute={() => setCallState({ isMuted: !isMuted })}
      onLeaveCall={endCall}
      onExpand={expandCall}
    />
  );
}