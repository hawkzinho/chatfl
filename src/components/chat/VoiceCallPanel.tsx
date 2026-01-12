import { useState } from "react";
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
    activeCallInfo,
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

  // Determine the call button text based on active call state
  const getCallButtonText = () => {
    if (activeCallInfo.hasActiveCall && !isInCall) {
      return `Entrar na chamada de ${activeCallInfo.starterName}`;
    }
    return 'Iniciar chamada';
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
          {(isInCall || activeCallInfo.hasActiveCall) && (
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
        <div className="flex flex-col items-center gap-3">
          {!isInCall ? (
            <>
              <Button
                size="lg"
                className="rounded-full w-14 h-14 bg-green-600 hover:bg-green-700"
                onClick={handleJoinCall}
                disabled={isJoining}
              >
                <Phone className="w-6 h-6" />
              </Button>
              {/* Show text about active call or start */}
              <p className="text-xs text-muted-foreground text-center">
                {activeCallInfo.hasActiveCall 
                  ? `${activeCallInfo.participantCount} pessoa${activeCallInfo.participantCount !== 1 ? 's' : ''} na chamada. Clique para entrar.`
                  : 'Clique para iniciar uma chamada de voz'
                }
              </p>
            </>
          ) : (
            <div className="flex justify-center gap-3">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
