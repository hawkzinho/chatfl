import { Button } from "@/components/ui/button";
import { UserAvatar } from "./UserAvatar";
import { ScreenShareViewer } from "./ScreenShareViewer";
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff,
  Volume2,
  Monitor,
  MonitorOff,
  Minimize2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Participant, ScreenShareInfo } from "@/hooks/useVoiceCall";
import { useVoiceCallContext } from "@/contexts/VoiceCallContext";

interface VoiceCallScreenProps {
  roomName: string;
  participants: Participant[];
  currentUserId: string;
  callDuration: number;
  isMuted: boolean;
  isScreenSharing: boolean;
  remoteScreenShares: ScreenShareInfo[];
  onToggleMute: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}

export function VoiceCallScreen({
  roomName,
  participants,
  currentUserId,
  callDuration,
  isMuted,
  isScreenSharing,
  remoteScreenShares,
  onToggleMute,
  onToggleScreenShare,
  onLeave,
}: VoiceCallScreenProps) {
  const voiceCallContext = useVoiceCallContext();

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMinimize = () => {
    voiceCallContext.minimizeCall();
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Chamada de Voz</h2>
          <p className="text-sm text-muted-foreground">#{roomName}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-mono font-medium text-green-500">
              {formatDuration(callDuration)}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={handleMinimize}
            title="Minimizar chamada"
          >
            <Minimize2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
        {/* Screen Share Viewer */}
        {remoteScreenShares.length > 0 && (
          <div className="flex-shrink-0">
            <ScreenShareViewer screenShares={remoteScreenShares} />
          </div>
        )}
        
        {/* Participants Grid */}
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            {participants.length} participante{participants.length !== 1 ? 's' : ''} na chamada
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {participants.map((participant) => {
              const isCurrentUser = participant.user_id === currentUserId;
              const isSpeaking = participant.isSpeaking && !participant.is_muted;
              
              return (
                <div
                  key={participant.id}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-xl transition-all",
                    isSpeaking 
                      ? "bg-green-500/20 ring-2 ring-green-500/50" 
                      : "bg-muted/50"
                  )}
                >
                  <div className="relative">
                    <UserAvatar
                      src={participant.avatar_url}
                      username={participant.username}
                      status="online"
                      size="lg"
                    />
                    {isSpeaking && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <Volume2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium truncate max-w-[100px]">
                      {isCurrentUser ? 'Você' : participant.username}
                    </p>
                    {isSpeaking && (
                      <p className="text-xs text-green-500">Falando...</p>
                    )}
                  </div>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    participant.is_muted ? "bg-destructive/20" : "bg-green-500/20"
                  )}>
                    {participant.is_muted ? (
                      <MicOff className="w-4 h-4 text-destructive" />
                    ) : (
                      <Mic className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 py-6 border-t border-border bg-card">
        <div className="flex justify-center gap-4">
          <Button
            variant={isMuted ? "destructive" : "outline"}
            size="lg"
            className="rounded-full w-14 h-14"
            onClick={onToggleMute}
            title={isMuted ? "Ativar microfone" : "Desativar microfone"}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>
          <Button
            variant={isScreenSharing ? "default" : "outline"}
            size="lg"
            className="rounded-full w-14 h-14"
            onClick={onToggleScreenShare}
            title={isScreenSharing ? "Parar compartilhamento" : "Compartilhar tela"}
          >
            {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="rounded-full w-14 h-14"
            onClick={handleMinimize}
            title="Minimizar chamada"
          >
            <Minimize2 className="w-6 h-6" />
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14"
            onClick={onLeave}
            title="Sair da chamada"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
