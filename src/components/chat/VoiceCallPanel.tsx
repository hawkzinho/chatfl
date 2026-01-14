import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "./UserAvatar";
import { ScreenShareViewer } from "./ScreenShareViewer";
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Users,
  Volume2,
  Monitor,
  MonitorOff,
  Minimize2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceCall, Participant } from "@/hooks/useVoiceCall";
import { useVoiceCallContext } from "@/contexts/VoiceCallContext";

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
    isScreenSharing,
    remoteScreenShares,
    participants,
    callDuration,
    hasActiveCall,
    callStarterName,
    joinCall,
    leaveCall,
    toggleMute,
    startScreenShare,
    stopScreenShare,
  } = useVoiceCall(roomId);

  const voiceCallContext = useVoiceCallContext();
  const [isJoining, setIsJoining] = useState(false);

  // Sync with global context
  useEffect(() => {
    voiceCallContext.setCallState({
      isInCall,
      roomId,
      roomName,
      isMuted,
      callDuration,
    });
  }, [isInCall, roomId, roomName, isMuted, callDuration]);

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
    voiceCallContext.endCall();
    onClose?.();
  };

  const handleMinimize = () => {
    voiceCallContext.minimizeCall();
    onClose?.();
  };

  // Get participant info from members
  const getParticipantInfo = (userId: string) => {
    return members.find(m => m.id === userId);
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Chamada de Voz
            </h3>
            <p className="text-xs text-muted-foreground">#{roomName}</p>
          </div>
          {(isInCall || hasActiveCall) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              <span>{participants.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Active participants */}
        {participants.length > 0 && (
          <div className="mb-4 flex-1">
            <p className="text-xs text-muted-foreground mb-2">Na chamada:</p>
            <div className="space-y-2">
              {participants.map((participant) => {
                const memberInfo = getParticipantInfo(participant.user_id);
                const isCurrentUser = participant.user_id === currentUserId;
                
                return (
                  <div 
                    key={participant.id} 
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                      participant.isSpeaking && !participant.is_muted
                        ? "bg-green-500/20 ring-2 ring-green-500/50" 
                        : "bg-muted/50"
                    )}
                  >
                    <div className="relative">
                      <UserAvatar
                        src={participant.avatar_url || memberInfo?.avatar}
                        username={participant.username}
                        status="online"
                        size="sm"
                      />
                      {participant.isSpeaking && !participant.is_muted && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                          <Volume2 className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {isCurrentUser ? 'Você' : participant.username}
                      </p>
                      {participant.isSpeaking && !participant.is_muted && (
                        <p className="text-xs text-green-500">Falando...</p>
                      )}
                    </div>
                    {participant.is_muted ? (
                      <MicOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Mic className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Screen Share Viewer */}
        {isInCall && remoteScreenShares.length > 0 && (
          <div className="mb-4">
            <ScreenShareViewer screenShares={remoteScreenShares} />
          </div>
        )}

        {/* No participants yet */}
        {participants.length === 0 && !isInCall && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Phone className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Nenhuma chamada ativa
              </p>
            </div>
          </div>
        )}

        {/* Call timer */}
        {isInCall && (
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-lg font-mono font-bold text-foreground">
                {formatDuration(callDuration)}
              </span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col items-center gap-3 mt-auto pt-4">
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
              <p className="text-xs text-muted-foreground text-center max-w-[200px]">
                {hasActiveCall 
                  ? `${participants.length} pessoa${participants.length !== 1 ? 's' : ''} na chamada iniciada por ${callStarterName}. Clique para entrar.`
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
                variant={isScreenSharing ? "default" : "outline"}
                size="lg"
                className="rounded-full w-12 h-12"
                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                title={isScreenSharing ? "Parar compartilhamento" : "Compartilhar tela"}
              >
                {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full w-12 h-12"
                onClick={handleMinimize}
                title="Minimizar chamada"
              >
                <Minimize2 className="w-5 h-5" />
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
