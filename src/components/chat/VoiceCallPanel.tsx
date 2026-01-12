import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "./UserAvatar";
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceCall } from "@/hooks/useVoiceCall";

interface User {
  id: string;
  username: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
}

interface VoiceCallPanelProps {
  roomId: string;
  roomName: string;
  members: User[];
  currentUserId?: string;
  onClose?: () => void;
}

// Modern, pleasant ringtone
const CALL_RINGTONE = 'data:audio/wav;base64,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';

export function VoiceCallPanel({
  roomId,
  roomName,
  members,
  currentUserId,
  onClose,
}: VoiceCallPanelProps) {
  const {
    isInCall,
    isMuted,
    participants,
    callDuration,
    joinCall,
    leaveCall,
    toggleMute,
  } = useVoiceCall(roomId);

  const [isJoining, setIsJoining] = useState(false);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleJoinCall = async () => {
    setIsJoining(true);
    await joinCall();
    setIsJoining(false);
  };

  const handleLeaveCall = async () => {
    await leaveCall();
    onClose?.();
  };

  // Get participant info from members
  const getParticipantInfo = (userId: string) => {
    return members.find(m => m.id === userId);
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Chamada de Voz
            </h3>
            <p className="text-xs text-muted-foreground">#{roomName}</p>
          </div>
          {isInCall && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              <span>{participants.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Active participants */}
        {participants.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">Na chamada:</p>
            <div className="flex flex-wrap gap-2">
              {participants.map((participant) => {
                const memberInfo = getParticipantInfo(participant.user_id);
                return (
                  <div 
                    key={participant.id} 
                    className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-full"
                  >
                    <div className={cn(
                      "relative",
                      !participant.is_muted && "ring-2 ring-green-500 ring-offset-1 ring-offset-background rounded-full"
                    )}>
                      <UserAvatar
                        src={participant.avatar_url || memberInfo?.avatar}
                        username={participant.username}
                        status="online"
                        size="sm"
                      />
                    </div>
                    <span className="text-xs font-medium">
                      {participant.user_id === currentUserId ? 'Você' : participant.username}
                    </span>
                    {participant.is_muted && (
                      <MicOff className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Call timer */}
        {isInCall && (
          <div className="text-center mb-4">
            <div className="text-2xl font-mono font-bold text-foreground">
              {formatDuration(callDuration)}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-3">
          {!isInCall ? (
            <Button
              size="lg"
              className="rounded-full w-14 h-14 bg-green-600 hover:bg-green-700"
              onClick={handleJoinCall}
              disabled={isJoining}
            >
              <Phone className="w-6 h-6" />
            </Button>
          ) : (
            <>
              <Button
                variant={isMuted ? "destructive" : "outline"}
                size="lg"
                className="rounded-full w-12 h-12"
                onClick={toggleMute}
                title={isMuted ? "Ativar microfone" : "Desativar microfone"}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              <Button
                variant="destructive"
                size="lg"
                className="rounded-full w-12 h-12"
                onClick={handleLeaveCall}
                title="Sair da chamada"
              >
                <PhoneOff className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>

        {/* Instructions */}
        {!isInCall && participants.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            Clique para iniciar uma chamada de voz
          </p>
        )}
        {!isInCall && participants.length > 0 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            {participants.length} pessoa{participants.length !== 1 ? 's' : ''} na chamada. Clique para entrar.
          </p>
        )}
      </div>
    </div>
  );
}
